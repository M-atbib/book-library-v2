import * as admin from "firebase-admin";
import * as firestoreFunctions from "firebase-functions/v2/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

// Get Firestore instance
const db = admin.firestore();

/**
 * Cloud Function that syncs book information changes across savedBooks collections
 * Triggers on: Update of a document in books/{bookId}
 * Updates: Corresponding book information in all savedBooks references
 */
export const syncBooksInfo = firestoreFunctions.onDocumentUpdated(
  "books/{bookId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      console.log("No data associated with the event");
      return null;
    }

    const bookId = event.params.bookId;

    // Check if any relevant fields have changed
    const relevantFields = ["title", "coverUrl", "genre", "tags"];
    const hasRelevantChanges = relevantFields.some(
      (field) => beforeData[field] !== afterData[field]
    );

    if (!hasRelevantChanges) {
      console.log("No relevant changes detected for savedBooks sync");
      return null;
    }

    try {
      // Prepare the update object with only the changed fields
      const updateData: Record<string, any> = {};

      relevantFields.forEach((field) => {
        if (beforeData[field] !== afterData[field]) {
          updateData[field] = afterData[field];
        }
      });

      // Get all users
      const usersSnapshot = await db.collection("users").get();
      let updatedSavedBooksCount = 0;

      // Process users in batches to avoid memory issues
      const batchPromises = [];
      let batch = db.batch();
      let batchCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        // For each user, check if they have this book in their savedBooks collection
        const savedBookRef = db
          .collection("users")
          .doc(userDoc.id)
          .collection("savedBooks")
          .doc(bookId);

        const savedBookDoc = await savedBookRef.get();

        if (savedBookDoc.exists) {
          batch.update(savedBookRef, updateData);
          batchCount++;
          updatedSavedBooksCount++;

          // Commit batch when it reaches the maximum size
          if (batchCount >= 100) {
            batchPromises.push(batch.commit());
            batch = db.batch();
            batchCount = 0;
          }
        }
      }

      // Commit any remaining updates
      if (batchCount > 0) {
        batchPromises.push(batch.commit());
      }

      // Wait for all batch operations to complete
      await Promise.all(batchPromises);

      console.log(
        `Updated ${updatedSavedBooksCount} savedBooks references for book ${bookId}`
      );

      return {
        success: true,
        message: `Successfully synced book information across ${updatedSavedBooksCount} savedBooks references`,
        updatedFields: Object.keys(updateData),
      };
    } catch (error) {
      console.error("Error syncing book information:", error);
      return {
        success: false,
        message: "Failed to sync book information",
        error: error,
      };
    }
  }
);

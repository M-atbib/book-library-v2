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

      // Query all savedBooks references that match this book ID
      // The document ID of savedBooks is the same as the book ID
      const savedBooksQuery = db
        .collectionGroup("savedBooks")
        .where(admin.firestore.FieldPath.documentId(), "==", bookId);

      const savedBooksSnapshot = await savedBooksQuery.get();

      if (savedBooksSnapshot.empty) {
        console.log(`No savedBooks references found for book ${bookId}`);
        return null;
      }

      // Update all savedBooks references in a batch
      const batch = db.batch();

      savedBooksSnapshot.forEach((doc) => {
        // Verify document still exists
        batch.update(doc.ref, updateData, { exists: true }); // Add precondition
      });

      await batch.commit();

      console.log(
        `Updated ${savedBooksSnapshot.size} savedBooks references for book ${bookId}`
      );

      return {
        success: true,
        message: `Successfully synced book information across ${savedBooksSnapshot.size} savedBooks references`,
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

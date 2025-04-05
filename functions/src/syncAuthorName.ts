import * as admin from "firebase-admin";
import * as firestoreFunctions from "firebase-functions/v2/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

// Get Firestore instance
const db = admin.firestore();

/**
 * Cloud Function that syncs author name changes across books and savedBooks collections
 * Triggers on: Update of a document in users/{userId} when the author changes their name
 * Updates: authorName field in all books by that author and in any savedBooks references
 */
export const syncAuthorName = firestoreFunctions.onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      console.log("No data associated with the event");
      return null;
    }

    const userId = event.params.userId;

    // Check if the name has actually changed
    if (beforeData.displayName === afterData.displayName) {
      console.log("No name change detected");
      return null;
    }

    try {
      // Verify the user is an author using custom claims
      const userRecord = await admin.auth().getUser(userId);
      const customClaims = userRecord.customClaims;

      if (!customClaims || customClaims.role !== "author") {
        console.log(`User ${userId} is not an author, skipping sync`);
        return null;
      }

      const newAuthorName = afterData.displayName;

      // Update all books by this author
      const booksQuery = db.collection("books").where("authorId", "==", userId);
      const booksSnapshot = await booksQuery.get();

      if (booksSnapshot.empty) {
        console.log(`No books found for author ${userId}`);
        return null;
      }

      const booksBatch = db.batch();
      const bookIds: string[] = [];

      booksSnapshot.forEach((doc) => {
        bookIds.push(doc.id);
        booksBatch.update(doc.ref, {
          authorName: newAuthorName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await booksBatch.commit();
      console.log(`Updated authorName in ${booksSnapshot.size} books`);

      // Update all savedBooks references by querying all users
      try {
        // Get all users
        const usersSnapshot = await db.collection("users").get();
        let updatedSavedBooksCount = 0;

        // Process users in batches to avoid memory issues
        const batchPromises = [];
        let batch = db.batch();
        let batchCount = 0;

        for (const userDoc of usersSnapshot.docs) {
          // For each user, check their savedBooks collection for books by this author
          const savedBooksRef = db
            .collection("users")
            .doc(userDoc.id)
            .collection("savedBooks");

          const savedBooksSnapshot = await savedBooksRef
            .where("authorName", "==", beforeData.displayName)
            .get();

          if (!savedBooksSnapshot.empty) {
            for (const doc of savedBooksSnapshot.docs) {
              batch.update(doc.ref, {
                authorName: newAuthorName,
              });

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
        }

        // Commit any remaining updates
        if (batchCount > 0) {
          batchPromises.push(batch.commit());
        }

        // IMPORTANT: Wait for all batch operations to complete
        await Promise.all(batchPromises);

        console.log(
          `Updated authorName in ${updatedSavedBooksCount} savedBooks references`
        );

        return {
          success: true,
          message: `Successfully synced author name to ${newAuthorName} across ${booksSnapshot.size} books and ${updatedSavedBooksCount} saved references`,
        };
      } catch (error) {
        console.error("Error updating savedBooks:", error);
        throw error; // Throw error to trigger function retry
      }
    } catch (error) {
      console.error("Error syncing author name:", error);
      return {
        success: false,
        message: "Failed to sync author name",
        error: error,
      };
    }
  }
);

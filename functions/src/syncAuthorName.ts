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

      // Update all savedBooks references
      const savedBooksQuery = db
        .collectionGroup("savedBooks")
        .where("authorId", "==", userId);
      const savedBooksSnapshot = await savedBooksQuery.get();

      if (!savedBooksSnapshot.empty) {
        const savedBooksBatch = db.batch();

        savedBooksSnapshot.forEach((doc) => {
          savedBooksBatch.update(doc.ref, {
            authorName: newAuthorName,
          });
        });

        await savedBooksBatch.commit();
        console.log(
          `Updated authorName in ${savedBooksSnapshot.size} savedBooks references`
        );
      }

      return {
        success: true,
        message: `Successfully synced author name to ${newAuthorName} across ${
          booksSnapshot.size
        } books and ${savedBooksSnapshot.size || 0} saved references`,
      };
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

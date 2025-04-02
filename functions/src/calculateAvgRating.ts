import * as admin from "firebase-admin";
import * as firestoreFunctions from "firebase-functions/v2/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

// Get Firestore instance
const db = admin.firestore();

/**
 * Cloud Function that calculates and updates the average rating for a book
 * whenever a rating is created or updated in the ratings subcollection.
 * Triggers on: Create or update of a document in books/{bookId}/ratings/{ratingId}
 * Updates: avgRating field in the parent book document and in any savedBooks references
 */
export const calculateAvgRating = firestoreFunctions.onDocumentWritten(
  "books/{bookId}/ratings/{ratingId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return null;
    }

    const bookId = event.params.bookId;
    const ratingData = snapshot.after.data() as {
      ratingValue: number;
      userId: string;
    };

    if (!ratingData || typeof ratingData.ratingValue !== "number") {
      console.log("Invalid rating data", ratingData);
      return null;
    }

    try {
      // Get a reference to the book document
      const bookRef = db.collection("books").doc(bookId);
      const bookDoc = await bookRef.get();

      if (!bookDoc.exists) {
        console.log(`Book ${bookId} not found`);
        return null;
      }

      const bookData = bookDoc.data();
      if (!bookData) {
        console.log(`No data for book ${bookId}`);
        return null;
      }

      // Calculate new average rating
      const currentAvgRating = bookData.avgRating || 0;
      const newRating = ratingData.ratingValue;

      // If currentAvgRating is 0, this is the first rating
      let newAvgRating;
      if (currentAvgRating === 0) {
        newAvgRating = newRating;
      } else {
        newAvgRating = (currentAvgRating + newRating) / 2;
      }

      // Update the book document with the new average rating
      await bookRef.update({
        avgRating: newAvgRating,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Updated avgRating for book ${bookId} to ${newAvgRating}`);

      // Update all savedBooks references in user collections
      const savedBooksQuery = db
        .collectionGroup("savedBooks")
        .where("id", "==", bookId);
      const savedBooksSnapshot = await savedBooksQuery.get();

      if (!savedBooksSnapshot.empty) {
        const batch = db.batch();

        savedBooksSnapshot.forEach((doc) => {
          batch.update(doc.ref, {
            avgRating: newAvgRating,
          });
        });

        await batch.commit();
        console.log(
          `Updated avgRating in ${savedBooksSnapshot.size} savedBooks references`
        );
      }

      return {
        success: true,
        message: `Successfully updated average rating to ${newAvgRating}`,
      };
    } catch (error) {
      console.error("Error updating average rating:", error);
      return {
        success: false,
        message: "Failed to update average rating",
        error: error,
      };
    }
  }
);

/**
 * Books Context Module
 *
 * This module provides a Svelte context for managing book-related state and operations.
 * It handles fetching, searching, filtering, sorting, rating, and saving books using
 * Firebase Firestore and Typesense for search functionality.
 */

import type {
  Book,
  BookRating,
  RatedBook,
  SavedBook,
} from "$lib/types/books.type";
import { getContext, setContext } from "svelte";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { handleError } from "$lib/utils/errorHandling";
import { auth, db } from "$lib/services/firebase";
import instantsearch from "instantsearch.js";
import { searchClient } from "$lib/services/typesense";
import { history } from "instantsearch.js/es/lib/routers";

/**
 * BookState class that manages all book-related state and operations
 */
export class BookState {
  // Books
  books = $state<Book[]>([]);
  book = $state<RatedBook | null>(null);
  totalBooks = $state<number>(0);
  isBookSaved = $state<boolean>(false);

  // Loading & Errors
  loading = $state<boolean>(false);
  error = $state<string | null>(null);

  // Track if search has been initialized
  searchInitialized = $state<boolean>(false);

  search = instantsearch({
    indexName: "books",
    searchClient,
    routing: {
      router: history(),
      stateMapping: {
        stateToRoute(uiState: any) {
          const indexUiState = uiState.books || {};
          return indexUiState;
        },
        routeToState(routeState: any) {
          return {
            books: routeState,
          };
        },
      },
    },
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });

  /**
   * Fetches a single book by ID and its user-specific data
   * @param id Book ID to fetch
   * @returns The book or null if not found
   */
  async fetchBookById(id: string) {
    try {
      this.loading = true;
      this.error = null;

      const bookRef = doc(db, "books", id);
      const bookDoc = await getDoc(bookRef);

      if (!bookDoc.exists()) {
        this.error = "Book not found";
        return null;
      }

      const book = {
        id: bookDoc.id,
        ...bookDoc.data(),
      } as Book;

      // Get user's rating if logged in
      let rating: BookRating | null = null;
      const currentUser = auth.currentUser;

      if (currentUser) {
        const ratingRef = doc(db, "books", id, "ratings", currentUser.uid);
        const ratingDoc = await getDoc(ratingRef);

        if (ratingDoc.exists()) {
          rating = ratingDoc.data() as BookRating;
        } else {
          rating = {
            ratingValue: 0,
            userId: currentUser.uid,
          };
        }

        // Check if book is saved by the user
        const savedBookRef = doc(
          db,
          "users",
          currentUser.uid,
          "savedBooks",
          id
        );
        const savedBookDoc = await getDoc(savedBookRef);
        this.isBookSaved = savedBookDoc.exists();
      } else {
        this.isBookSaved = false;
      }

      this.book = {
        book,
        rating: rating || { ratingValue: 0, userId: "" },
      };
    } catch (error) {
      this.error = handleError(error).message;
      console.error("Error fetching book by ID:", error);
      return null;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Saves or unsaves a book for the current user
   * @param book Book to save or unsave
   * @returns Success status
   */
  async saveBook(book: Book): Promise<boolean> {
    try {
      this.loading = true;
      this.error = null;

      const currentUser = auth.currentUser;
      if (!currentUser) {
        this.error = "User not authenticated";
        return false;
      }

      const savedBookRef = doc(
        db,
        "users",
        currentUser.uid,
        "savedBooks",
        book.id
      );

      // Toggle save/unsave based on current state
      if (this.isBookSaved) {
        // Unsave the book
        await deleteDoc(savedBookRef);
        this.isBookSaved = false;
      } else {
        // Create SavedBook object with only the required fields
        const savedBook: SavedBook = {
          id: book.id,
          title: book.title,
          authorName: book.authorName,
          coverUrl: book.coverUrl,
          avgRating: book.avgRating,
          genre: book.genre,
          tags: book.tags,
          userId: currentUser.uid,
        };

        // Save to user's saved books subcollection
        await setDoc(savedBookRef, savedBook);
        this.isBookSaved = true;
      }

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      console.error("Error saving/unsaving book:", error);
      return false;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Rates a book and updates the average rating
   * @param bookId ID of the book to rate
   * @param rating Rating value (1-5)
   * @returns Success status
   */
  async rateBook(bookId: string, rating: number): Promise<boolean> {
    try {
      this.loading = true;
      this.error = null;

      const currentUser = auth.currentUser;
      if (!currentUser) {
        this.error = "User not authenticated";
        return false;
      }

      // Create rating object
      const bookRating: BookRating = {
        ratingValue: rating,
        userId: currentUser.uid,
      };

      // Get the book reference
      const bookRef = doc(db, "books", bookId);
      const bookDoc = await getDoc(bookRef);

      if (!bookDoc.exists()) {
        this.error = "Book not found";
        return false;
      }

      const bookData = bookDoc.data();
      const currentAvgRating = bookData.avgRating || 0;
      const currentRatingCount = bookData.ratingCount || 0;

      // Check if user has already rated this book
      const ratingRef = doc(db, "books", bookId, "ratings", currentUser.uid);
      const ratingDoc = await getDoc(ratingRef);
      const isNewRating = !ratingDoc.exists();
      const previousRating = isNewRating
        ? 0
        : (ratingDoc.data() as BookRating).ratingValue;

      // Save rating to book's ratings subcollection
      await setDoc(ratingRef, bookRating);

      // Calculate new average rating
      let newAvgRating;
      let newRatingCount = currentRatingCount;

      if (isNewRating) {
        // This is a new rating, increment the count
        newRatingCount = currentRatingCount + 1;
        // Calculate new average: (avgRating * ratingCount + newRating) / (ratingCount + 1)
        newAvgRating =
          (currentAvgRating * currentRatingCount + rating) / newRatingCount;
      } else {
        // User is updating their previous rating
        // Remove the previous rating and add the new one
        newAvgRating =
          (currentAvgRating * currentRatingCount - previousRating + rating) /
          currentRatingCount;
      }

      // Update the book document with new average rating and count
      await updateDoc(bookRef, {
        avgRating: newAvgRating,
        ratingCount: newRatingCount,
        updatedAt: serverTimestamp(),
      });

      // Update the avgRating reactively in the UI
      if (this.book && this.book.book.id === bookId) {
        // Update the book's avgRating in the local state
        this.book.book.avgRating = newAvgRating;

        // Also update in the books list if present
        const bookIndex = this.books.findIndex((b) => b.id === bookId);
        if (bookIndex !== -1) {
          this.books[bookIndex].avgRating = newAvgRating;
        }
      }

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      console.error("Error rating book:", error);
      return false;
    } finally {
      this.loading = false;
    }
  }

  // New method to safely start search
  startSearch() {
    if (!this.searchInitialized) {
      try {
        this.search.start();
        this.searchInitialized = true;
      } catch (error) {
        console.error("Error starting search:", error);
      }
    }
  }

  // Method to safely dispose search
  disposeSearch() {
    if (this.searchInitialized) {
      try {
        this.search.dispose();
        this.searchInitialized = false;
      } catch (error) {
        console.error("Error disposing search:", error);
      }
    }
  }
}

/**
 * Symbol key for the book state context
 */
const BOOK_STATE_KEY = Symbol("BOOK_STATE");

/**
 * Creates and sets the book state in the Svelte context
 * @returns The BookState instance
 */
export function setBookState() {
  return setContext(BOOK_STATE_KEY, new BookState());
}

/**
 * Gets the book state from the Svelte context
 * @returns The BookState instance
 */
export function getBookState() {
  return getContext<ReturnType<typeof setBookState>>(BOOK_STATE_KEY);
}

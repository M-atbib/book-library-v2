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
import type { Timestamp } from "firebase/firestore";
import { browser } from "$app/environment";
import type { UserRole } from "$lib/types/user.type";
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
  role = $state<UserRole | null>(null);

  // Track if search has been initialized
  searchInitialized = $state<boolean>(false);
  search = instantsearch({
    indexName: "books",
    searchClient,
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });

  private readonly FILTER_STORAGE_KEY = "book_filter_state";
  private readonly SORT_STORAGE_KEY = "book_sort_option";

  // Default sort option
  private readonly DEFAULT_SORT = "books/sort/publishedDate:desc";

  /**
   * Fetches a single book by ID and its user-specific data
   * @param id Book ID to fetch
   * @returns The book or null if not found
   */
  async fetchBookById(id: string) {
    try {
      this.loading = true;
      this.error = null;

      const bookDoc = await getDoc(doc(db, "books", id));

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

      if (auth.currentUser) {
        const ratingDoc = await getDoc(
          doc(db, "books", id, "ratings", auth.currentUser.uid)
        );

        if (ratingDoc.exists()) {
          rating = ratingDoc.data() as BookRating;
        } else {
          rating = {
            ratingValue: 0,
            userId: auth.currentUser.uid,
          };
        }

        // Check if book is saved by the user
        const savedBookDoc = await getDoc(
          doc(db, "users", auth.currentUser.uid, "savedBooks", id)
        );
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

      if (!auth.currentUser) {
        this.error = "User not authenticated";
        return false;
      }

      const savedBookRef = doc(
        db,
        "users",
        auth.currentUser.uid,
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
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp() as Timestamp,
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

      if (!auth.currentUser) {
        this.error = "User not authenticated";
        return false;
      }

      // Create rating object
      const bookRating: BookRating = {
        ratingValue: rating,
        userId: auth.currentUser.uid,
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
      const ratingRef = doc(
        db,
        "books",
        bookId,
        "ratings",
        auth.currentUser.uid
      );
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

  analyticsMiddleware = () => {
    return {
      onStateChange() {
        if (browser) {
          import("firebase/analytics").then(
            ({ getAnalytics, logEvent, setCurrentScreen }) => {
              const analytics = getAnalytics();
              const currentPath = (
                window.location.pathname + window.location.search
              ).toLowerCase();

              setCurrentScreen(analytics, currentPath);
              logEvent(analytics, "page_view", {
                page_path: currentPath,
              });
            }
          );
        }
      },
      subscribe() {},
      unsubscribe() {},
    };
  };

  /**
   * Saves the current search state to localStorage
   */
  saveSearchState() {
    if (!browser) return;

    try {
      // Save filter state
      const uiState = this.search.getUiState();
      const currentState = uiState.books || {};

      if (Object.keys(currentState).length > 0) {
        localStorage.setItem(
          this.FILTER_STORAGE_KEY,
          JSON.stringify(currentState)
        );
      }

      // Save sort option
      const currentIndex = this.search.helper?.state?.index;
      if (currentIndex) {
        localStorage.setItem(this.SORT_STORAGE_KEY, currentIndex);
      }
    } catch (error) {
      console.error("Error saving search state to localStorage:", error);
    }
  }

  /**
   * Gets the saved sort option from localStorage
   * @returns The saved sort option or the default value
   */
  getSavedSortOption(): string {
    if (!browser) return this.DEFAULT_SORT;

    try {
      const savedSort = localStorage.getItem(this.SORT_STORAGE_KEY);
      return savedSort || this.DEFAULT_SORT;
    } catch (error) {
      console.error("Error getting sort option from localStorage:", error);
      return this.DEFAULT_SORT;
    }
  }

  /**
   * Loads saved search state (filters and sort) from localStorage
   */
  loadSavedSearchState() {
    if (!browser || !this.searchInitialized) return;

    try {
      // Restore filters
      const savedState = localStorage.getItem(this.FILTER_STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.search.setUiState({ books: parsedState });
      }

      // Restore sort option
      const savedSort = localStorage.getItem(this.SORT_STORAGE_KEY);
      if (savedSort) {
        this.search.helper?.setIndex(savedSort).search();
      }
    } catch (error) {
      console.error("Error loading search state from localStorage:", error);
    }
  }

  /**
   * Sets the sort option and saves it to localStorage
   * @param sortOption The sort option to set
   */
  setSortOption(sortOption: string) {
    if (!browser || !this.searchInitialized) return;

    try {
      this.search.helper?.setIndex(sortOption).search();
      localStorage.setItem(this.SORT_STORAGE_KEY, sortOption);
    } catch (error) {
      console.error("Error setting sort option:", error);
    }
  }

  // Update the startSearch method
  startSearch() {
    if (!this.searchInitialized) {
      try {
        // Check for saved sort option before starting the search
        if (browser) {
          const savedSort = this.getSavedSortOption();
          this.search.helper?.setIndex(savedSort);
        }

        this.search.start();
        this.searchInitialized = true;
      } catch (error) {
        console.error("Error starting search:", error);
      }
    }
  }

  // Create the middleware for saving state
  createStateMiddleware() {
    return () => {
      return {
        onStateChange: () => {
          this.saveSearchState();
        },
        subscribe() {},
        unsubscribe() {},
      };
    };
  }

  /**
   * Fetches the current user's role from Firebase Auth claims
   * @returns The user's role or null if not authenticated
   */
  async getRole() {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return null;
    }

    try {
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      this.role = idTokenResult.claims.role as UserRole;
    } catch (error) {
      this.error = handleError(error).message;
      return null;
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

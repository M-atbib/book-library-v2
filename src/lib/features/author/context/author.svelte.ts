/**
 * Author Context Module
 *
 * This module provides a Svelte context for managing author-related state and operations.
 * It handles fetching, publishing, editing, and deleting books associated with the user's profile,
 * as well as managing saved books and user roles using Firebase Firestore.
 */

import type { Book } from "$lib/types/books.type";
import { auth, db } from "$lib/services/firebase";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
} from "firebase/firestore";
import { handleError } from "$lib/utils/errorHandling";
import { getContext } from "svelte";
import { setContext } from "svelte";
import { toFirestoreTimestamp } from "$lib/utils/dateFormatting";
import type { UserRole } from "$lib/types/user.type";
import { searchClient } from "$lib/services/typesense";
import instantsearch from "instantsearch.js/es/index";
import { searchBox, configure } from "instantsearch.js/es/widgets";
import { connectHits, connectPagination } from "instantsearch.js/es/connectors";

/**
 * AuthorState class that manages all author-related state and operations
 */
export class AuthorState {
  loading = $state<boolean>(false);
  error = $state<string | null>(null);
  role = $state<UserRole | null>(null);

  // Search state
  searchInstance = instantsearch({
    indexName: "books",
    searchClient,
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });

  searchResults = $state<Book[]>([]);
  currentPage = $state(1);
  totalPages = $state(0);
  refineFunction: ((page: number) => void) | null = null;
  totalPublishedBooks = $state(0);

  /**
   * Initializes the search functionality
   */
  initializeSearch() {
    if (!auth.currentUser) return;

    const authorId = auth.currentUser.uid;

    const customHits = connectHits(({ hits }) => {
      this.searchResults = hits as unknown as Book[];
    });

    const customPagination = connectPagination(
      ({ currentRefinement, nbPages, refine }) => {
        this.currentPage = currentRefinement;
        this.totalPages = nbPages;
        this.refineFunction = refine;
      }
    );

    this.searchInstance.addWidgets([
      configure({
        filters: `authorId:${authorId}`,
        hitsPerPage: 10,
      }),
      searchBox({
        container: "#searchbox",
        placeholder: "Search your books",
        cssClasses: {
          input: "input input-bordered w-full",
          submit: "btn btn-ghost absolute right-0 top-0",
          reset: "btn btn-ghost absolute right-12 top-0",
        },
      }),
      customHits({}),
      customPagination({}),
    ]);

    this.searchInstance.start();

    // Fetch total book count
    this.fetchTotalPublishedBooks();
  }

  /**
   * Fetches the total number of published books by the current user
   */
  async fetchTotalPublishedBooks() {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const booksRef = collection(db, "books");
      const q = query(booksRef, where("authorId", "==", userId));
      const snapshot = await getCountFromServer(q);
      this.totalPublishedBooks = snapshot.data().count;
    } catch (error) {
      this.error = handleError(error).message;
    }
  }

  /**
   * Disposes of the search instance
   */
  disposeSearch() {
    if (this.searchInstance) {
      this.searchInstance.dispose();
    }
  }

  /**
   * Handles page changes in search results
   */
  handlePageChange(newPage: number) {
    if (this.refineFunction) {
      this.refineFunction(newPage);
    }
  }

  /**
   * Refreshes the search results
   */
  refreshSearch() {
    if (this.searchInstance) {
      this.searchInstance.refresh();
    }
  }

  /**
   * Publishes a new book to Firestore
   * @param book Book data to publish (without ID)
   * @returns The ID of the newly created book, or null if failed
   */
  async publishBook(book: Omit<Book, "id">) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return null;
    }

    try {
      this.loading = true;
      this.error = null;

      // Optimistic UI update
      this.totalPublishedBooks++;

      const booksRef = collection(db, "books");

      // Prepare book data - explicitly omitting any potential id field
      const { id, ...bookWithoutId } = book as any;

      const bookData = {
        ...bookWithoutId,
        avgRating: 0, // Initial rating for new book
        publishedDate: toFirestoreTimestamp(book.publishedDate),
      };

      // Add document to Firestore - the ID will be automatically generated
      // and not stored within the document itself
      const docRef = await addDoc(booksRef, bookData);
      this.searchResults.push(bookData as Book);
      return docRef.id;
    } catch (error) {
      // Revert optimistic update on error
      this.totalPublishedBooks--;
      this.error = handleError(error).message;
      return null;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Deletes a book from Firestore
   * @param bookId ID of the book to delete
   * @returns True if successful, false otherwise
   */
  async deleteBook(bookId: string) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return false;
    }

    try {
      this.loading = true;
      this.error = null;

      const userId = auth.currentUser.uid;
      const bookRef = doc(db, "books", bookId);

      // Check if book exists and belongs to current user
      const bookDoc = await getDoc(bookRef);
      if (!bookDoc.exists()) {
        this.error = "Book not found";
        return false;
      }

      const bookData = bookDoc.data() as Book;
      if (bookData.authorId !== userId) {
        this.error = "You don't have permission to delete this book";
        return false;
      }

      // Optimistic UI update - remove book from search results
      this.searchResults = this.searchResults.filter(
        (book) => book.id !== bookId
      );
      this.totalPublishedBooks = Math.max(0, this.totalPublishedBooks - 1);

      // Delete the book
      await deleteDoc(bookRef);

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      // Revert optimistic updates on error
      this.refreshSearch();
      this.fetchTotalPublishedBooks();
      return false;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Edits an existing book in Firestore
   * @param book Updated book data with ID
   * @returns True if successful, false otherwise
   */
  async editBook(book: Book) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return false;
    }

    try {
      this.loading = true;
      this.error = null;

      const userId = auth.currentUser.uid;
      const bookRef = doc(db, "books", book.id);

      // Check if book exists and belongs to current user
      const bookDoc = await getDoc(bookRef);
      if (!bookDoc.exists()) {
        this.error = "Book not found";
        return false;
      }

      const bookData = bookDoc.data() as Book;
      if (bookData.authorId !== userId) {
        this.error = "You don't have permission to edit this book";
        return false;
      }

      // Check if user has author role as required by Firestore rules
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      if (idTokenResult.claims.role !== "author") {
        this.error = "Only authors can edit books";
        return false;
      }

      // Validate book data according to Firestore rules
      if (
        !book.title ||
        !book.authorName ||
        !book.authorId ||
        !book.genre ||
        !book.publishedDate ||
        !book.description ||
        !Array.isArray(book.tags) ||
        !book.pages ||
        book.pages <= 0
      ) {
        this.error = "Invalid book data";
        return false;
      }

      // Optimistic UI update - update book in search results
      const bookIndex = this.searchResults.findIndex((b) => b.id === book.id);
      if (bookIndex !== -1) {
        this.searchResults = [
          ...this.searchResults.slice(0, bookIndex),
          book,
          ...this.searchResults.slice(bookIndex + 1),
        ];
      }

      // Update the book with all required fields
      await updateDoc(bookRef, {
        title: book.title,
        authorName: book.authorName,
        authorId: book.authorId, // This should match the current user ID
        coverUrl: book.coverUrl || "",
        genre: book.genre,
        tags: book.tags,
        publishedDate: toFirestoreTimestamp(book.publishedDate),
        description: book.description,
        pages: book.pages,
        avgRating: book.avgRating,
      });

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      // Revert optimistic updates on error
      this.refreshSearch();
      return false;
    } finally {
      this.loading = false;
    }
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

  /**
   * Clears any error messages
   */
  clearError() {
    this.error = null;
  }
}

/**
 * Symbol key for the author state context
 */
const AUTHOR_STATE_KEY = Symbol("AUTHOR_STATE");

/**
 * Creates and sets the author state context
 * @returns The author state instance
 */
export function setAuthorState() {
  return setContext(AUTHOR_STATE_KEY, new AuthorState());
}

/**
 * Gets the profile state from the Svelte context
 * @returns The profile state instance
 */
export function getAuthorState() {
  return getContext<ReturnType<typeof setAuthorState>>(AUTHOR_STATE_KEY);
}

/**
 * Reader Context Module
 *
 * This module provides a Svelte context for managing user reader-related state and operations.
 * It handles fetching, publishing, editing, and deleting books associated with the user's reader,
 * as well as managing saved books and user roles using Firebase Firestore.
 */

import type { SavedBook } from "$lib/types/books.type";
import { auth, db } from "$lib/services/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  limit,
  startAfter,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { handleError } from "$lib/utils/errorHandling";
import { getContext } from "svelte";
import { setContext } from "svelte";

/**
 * Pagination state interface for book listings
 */
interface Pagination {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  lastVisible: any;
  pageSize: number;
}

/**
 * ReaderState class that manages all reader-related state and operations
 */
export class ReaderState {
  savedBooks = $state<SavedBook[]>([]);
  loading = $state<boolean>(false);
  error = $state<string | null>(null);
  savedBooksPagination = $state<Pagination>({
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    lastVisible: null,
    pageSize: 10,
  });

  /**
   * Fetches saved books for the current user with pagination support
   * @param loadMore Whether to load more books or refresh the list
   */
  async fetchSavedBooks(loadMore = false) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return;
    }

    try {
      this.loading = true;
      this.error = null;

      const userId = auth.currentUser.uid;
      const savedBooksRef = collection(db, `users/${userId}/savedBooks`);

      let savedBooksQuery;

      if (loadMore && this.savedBooksPagination.lastVisible) {
        savedBooksQuery = query(
          savedBooksRef,
          orderBy("title"),
          startAfter(this.savedBooksPagination.lastVisible),
          limit(this.savedBooksPagination.pageSize)
        );
      } else {
        // First load or refresh
        savedBooksQuery = query(
          savedBooksRef,
          orderBy("title"),
          limit(this.savedBooksPagination.pageSize)
        );

        if (!loadMore) {
          this.savedBooks = [];
          this.savedBooksPagination.currentPage = 1;
        }
      }

      const snapshot = await getDocs(savedBooksQuery);

      if (snapshot.empty && !loadMore) {
        this.savedBooks = [];
        this.savedBooksPagination.hasNextPage = false;
        return;
      }

      const books: SavedBook[] = [];
      snapshot.forEach((doc) => {
        const bookData = doc.data() as SavedBook;
        books.push({
          ...bookData,
        });
      });

      // Update pagination
      this.savedBooksPagination.lastVisible =
        snapshot.docs[snapshot.docs.length - 1];
      this.savedBooksPagination.hasNextPage =
        books.length === this.savedBooksPagination.pageSize;
      this.savedBooksPagination.hasPreviousPage =
        this.savedBooksPagination.currentPage > 1;

      if (loadMore) {
        this.savedBooks = [...this.savedBooks, ...books];
        this.savedBooksPagination.currentPage += 1;
      } else {
        this.savedBooks = books;
      }
    } catch (error) {
      this.error = handleError(error).message;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Removes a book from the user's saved books collection
   * @param bookId ID of the book to remove
   * @returns True if successful, false otherwise
   */
  async removeSavedBook(bookId: string) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return false;
    }

    try {
      this.loading = true;
      this.error = null;

      const userId = auth.currentUser.uid;
      const savedBookRef = doc(db, `users/${userId}/savedBooks`, bookId);

      // Delete the document from the savedBooks subcollection
      await deleteDoc(savedBookRef);

      // Update the local state by removing the book
      this.savedBooks = this.savedBooks.filter((book) => book.id !== bookId);

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      return false;
    } finally {
      this.loading = false;
    }
  }
}

/**
 * Symbol key for the reader state context
 */
const READER_STATE_KEY = Symbol("READER_STATE");

/**
 * Creates and sets the profile state context
 * @returns The profile state instance
 */
export function setReaderState() {
  return setContext(READER_STATE_KEY, new ReaderState());
}

/**
 * Gets the profile state from the Svelte context
 * @returns The profile state instance
 */
export function getReaderState() {
  return getContext<ReturnType<typeof setReaderState>>(READER_STATE_KEY);
}

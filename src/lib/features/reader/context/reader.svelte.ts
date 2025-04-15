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
  deleteDoc,
  getCountFromServer,
} from "firebase/firestore";
import { handleError } from "$lib/utils/errorHandling";
import { getContext } from "svelte";
import { setContext } from "svelte";
import { searchClientSavedBooks } from "$lib/services/typesense";
import instantsearch from "instantsearch.js/es/index";
import { searchBox, configure } from "instantsearch.js/es/widgets";
import { connectHits, connectPagination } from "instantsearch.js/es/connectors";

/**
 * ReaderState class that manages all reader-related state and operations
 */
export class ReaderState {
  // Search state
  searchInstance = instantsearch({
    indexName: "savedBooks",
    searchClient: searchClientSavedBooks,
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });
  searchResults = $state<SavedBook[]>([]);
  currentPage = $state(1);
  totalPages = $state(0);
  refineFunction: ((page: number) => void) | null = null;
  totalSavedBooks = $state(0);
  loading = $state<boolean>(false);
  error = $state<string | null>(null);

  /**
   * Fetches saved books from Firestore
   * @param updateLoadingState - Whether to update the loading state (default: true)
   */
  async fetchSavedBooks(updateLoadingState = true) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return;
    }

    try {
      if (updateLoadingState) {
        this.loading = true;
      }

      const userId = auth.currentUser.uid;
      const savedBooksRef = collection(db, `users/${userId}/savedBooks`);
      const snapshot = await getCountFromServer(savedBooksRef);
      this.totalSavedBooks = snapshot.data().count;
    } catch (error) {
      this.error = handleError(error).message;
    } finally {
      if (updateLoadingState) {
        this.loading = false;
      }
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

    this.searchResults = this.searchResults.filter(
      (book) => book.id !== bookId
    );
    this.totalSavedBooks = Math.max(0, this.totalSavedBooks - 1);

    try {
      const userId = auth.currentUser.uid;
      const savedBookRef = doc(db, `users/${userId}/savedBooks`, bookId);

      await deleteDoc(savedBookRef);

      return true;
    } catch (error) {
      this.error = handleError(error).message;

      await this.fetchSavedBooks();

      return false;
    }
  }

  /**
   * Initializes the search functionality
   */
  initializeSearch() {
    if (!auth.currentUser) return;

    const customHits = connectHits(({ hits }) => {
      this.searchResults = hits as unknown as SavedBook[];
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
        facetFilters: [`userId:${auth.currentUser.uid}`],
        distinct: true,
        page: 0,
      }),
      searchBox({
        container: "#searchbox",
        placeholder: "Search your saved books",
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

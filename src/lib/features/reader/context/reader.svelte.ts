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
import { searchClient } from "$lib/services/typesense";
import instantsearch from "instantsearch.js/es/index";
import { searchBox, configure } from "instantsearch.js/es/widgets";
import { connectHits, connectPagination } from "instantsearch.js/es/connectors";

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

  // Search state
  searchInstance = instantsearch({
    indexName: "savedBooks",
    searchClient,
    future: {
      preserveSharedStateOnUnmount: true,
    },
  });
  searchResults = $state<SavedBook[]>([]);
  currentPage = $state(1);
  totalPages = $state(0);
  refineFunction: ((page: number) => void) | null = null;

  /**
   * Fetches saved books for the current user with pagination support
   * @param loadMore Whether to load more books or refresh the list
   */
  async fetchSavedBooks() {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return;
    }

    try {
      this.loading = true;
      this.error = null;

      const userId = auth.currentUser.uid;
      const savedBooksRef = collection(db, `users/${userId}/savedBooks`);
      const snapshot = await getCountFromServer(savedBooksRef);

      return snapshot.data().count;
    } catch (error) {
      this.error = handleError(error).message;
      return 0;
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

      // Refresh search results after removal
      this.refreshSearch();

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      return false;
    } finally {
      this.loading = false;
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

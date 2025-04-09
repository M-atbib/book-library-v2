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
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { handleError } from "$lib/utils/errorHandling";
import { auth, db } from "$lib/services/firebase";
import { client } from "$lib/services/typesense";

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
 * Interface for faceted search results
 */
interface FacetResult {
  genres: { value: string; count: number }[];
  ratings: { value: number; count: number }[];
  tags: { value: string; count: number }[];
}

/**
 * BookState class that manages all book-related state and operations
 */
export class BookState {
  books = $state<Book[]>([]);
  book = $state<RatedBook | null>(null);
  totalBooks = $state<number>(0);
  isBookSaved = $state<boolean>(false);
  pagination = $state<Pagination>({
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    lastVisible: null,
    pageSize: 10,
  });

  loading = $state<boolean>(false);
  error = $state<string | null>(null);

  currentPage = $state<number>(1);
  totalHits = $state<number>(0);
  hasMoreResults = $state<boolean>(false);
  pageSize = $state<number>(20);
  lastSearchParams = $state<any>(null);

  /**
   * Helper method to deduplicate books by ID
   * @param books Array of books to deduplicate
   * @returns Array of unique books
   */
  private deduplicateBooks(books: Book[]): Book[] {
    const uniqueBooks = new Map<string, Book>();
    books.forEach((book) => {
      if (!uniqueBooks.has(book.id)) {
        uniqueBooks.set(book.id, book);
      }
    });
    return Array.from(uniqueBooks.values());
  }

  /**
   * Fetches books from Firestore with pagination
   * @param loadMore Whether to load more books or start from the first page
   */
  async fetchBooks(loadMore = false) {
    try {
      this.loading = true;
      this.error = null;

      const booksRef = collection(db, "books");
      let booksQuery;

      if (loadMore && this.pagination.lastVisible) {
        // Load next page
        booksQuery = query(
          booksRef,
          orderBy("title"),
          startAfter(this.pagination.lastVisible),
          limit(this.pagination.pageSize)
        );
      } else {
        // Load first page
        booksQuery = query(
          booksRef,
          orderBy("title"),
          limit(this.pagination.pageSize)
        );

        if (!loadMore) {
          this.books = [];
          this.pagination.currentPage = 1;
        }
      }

      const snapshot = await getDocs(booksQuery);

      // Update pagination
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      const hasNextPage = snapshot.docs.length === this.pagination.pageSize;

      if (loadMore) {
        // Append books to existing list
        const newBooks = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Book)
        );

        this.books = [...this.books, ...newBooks];
        this.pagination.currentPage += 1;
      } else {
        // Replace books with new list
        this.books = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Book)
        );
      }

      // Update pagination state
      this.pagination.lastVisible = lastVisible;
      this.pagination.hasNextPage = hasNextPage;
      this.pagination.hasPreviousPage = this.pagination.currentPage > 1;

      // Get total count (in a real app, you might want to use a counter document)
      const countQuery = await getDocs(collection(db, "books"));
      this.totalBooks = countQuery.size;
      this.pagination.totalPages = Math.ceil(
        this.totalBooks / this.pagination.pageSize
      );
    } catch (error) {
      this.error = handleError(error).message;
      console.error("Error fetching books:", error);
    } finally {
      this.loading = false;
    }
  }

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

  /**
   * Common method to update books state after search/filter/sort
   * @param results Search results from Typesense
   * @param page Current page number
   * @param newBooks New books to add to the state
   */
  private updateBooksState(results: any, page: number, newBooks: Book[]) {
    if (page === 1) {
      this.books = newBooks;
    } else {
      // Deduplicate books when appending new results
      this.books = this.deduplicateBooks([...this.books, ...newBooks]);
    }

    this.totalHits = results.found;
    this.currentPage = page;
    this.hasMoreResults = this.books.length < this.totalHits;
  }

  /**
   * Searches books using Typesense
   * @param query Search query string
   * @param page Page number for pagination
   */
  async handleSearchResults(query: string, page: number = 1) {
    try {
      this.loading = true;
      this.error = null;

      const searchParameters = {
        q: query || "*",
        query_by: "title,authorName,description,genre,tags",
        page,
        per_page: this.pageSize,
        sort_by: "_text_match:desc,avgRating:desc",
      };

      this.lastSearchParams = searchParameters;

      const results = await client
        .collections("books")
        .documents()
        .search(searchParameters);

      const newBooks = results.hits?.map((hit) => hit.document as Book) || [];
      this.updateBooksState(results, page, newBooks);
    } catch (error) {
      this.error = handleError(error).message;
      console.error("Error searching books:", error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Gets search suggestions for autocomplete
   * @param query Partial search query
   * @returns Array of book suggestions
   */
  async getSearchSuggestions(query: string): Promise<any[]> {
    try {
      if (!query || query.length < 2) return [];

      const searchParameters = {
        q: query,
        query_by: "title,authorName",
        per_page: 5,
        sort_by: "avgRating:desc",
        highlight: {
          fields: ["title", "authorName"],
        },
        limit: 20,
      };

      const results = await client
        .collections("books")
        .documents()
        .search(searchParameters);

      if (results.hits && results.hits.length > 0) {
        return results.hits.map((hit) => hit.document);
      }

      return [];
    } catch (error) {
      console.error("Error getting search suggestions:", error);
      return [];
    }
  }

  /**
   * Sorts books by different criteria
   * @param sortOption Sort option (newest, oldest, rating)
   * @param page Page number for pagination
   */
  async sortBooks(sortOption: string, page: number = 1) {
    try {
      this.loading = true;
      this.error = null;

      let sortBy = "";
      switch (sortOption) {
        case "newest":
          sortBy = "publishedDate:desc";
          break;
        case "oldest":
          sortBy = "publishedDate:asc";
          break;
        case "rating":
          sortBy = "avgRating:desc";
          break;
        default:
          sortBy = "publishedDate:desc";
      }

      const searchParameters = {
        q: "*",
        query_by: "title",
        sort_by: sortBy,
        page,
        per_page: this.pageSize,
      };

      this.lastSearchParams = searchParameters;

      const results = await client
        .collections("books")
        .documents()
        .search(searchParameters);

      const newBooks = results.hits?.map((hit) => hit.document as Book) || [];
      this.updateBooksState(results, page, newBooks);
    } catch (error) {
      this.error = handleError(error).message;
      console.error("Error sorting books:", error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Gets facet counts for filtering options
   * @returns Facet results or null if error
   */
  async getFacets(): Promise<FacetResult | null> {
    try {
      this.loading = true;

      // Search parameters for Typesense to get facets
      const searchParameters = {
        q: "*", // Match all documents
        query_by: "title", // Required field
        facet_by: "genre, avgRating, tags", // Request facets
        per_page: 0, // We only need facets, not results
      };

      const results = await client
        .collections("books")
        .documents()
        .search(searchParameters);

      if (!results.facet_counts) {
        return null;
      }

      // Process genre facets
      const genres =
        results.facet_counts
          .find((facet) => facet.field_name === "genre")
          ?.counts.map((item) => ({ value: item.value, count: item.count })) ||
        [];

      // Process rating facets - convert string ratings to numbers
      const ratings =
        results.facet_counts
          .find((facet) => facet.field_name === "avgRating")
          ?.counts.map((item) => ({
            value: Math.floor(parseFloat(item.value)),
            count: item.count,
          }))
          .filter((item) => item.value > 0 && item.value <= 5)
          .reduce((acc, curr) => {
            // Combine ratings by integer value (e.g., 4.1, 4.2, 4.3 all become 4)
            const existing = acc.find((r) => r.value === curr.value);
            if (existing) {
              existing.count += curr.count;
            } else {
              acc.push(curr);
            }
            return acc;
          }, [] as { value: number; count: number }[])
          .sort((a, b) => b.value - a.value) || [];

      // Process tag facets
      const tags =
        results.facet_counts
          .find((facet) => facet.field_name === "tags")
          ?.counts.map((item) => ({ value: item.value, count: item.count })) ||
        [];

      return { genres, ratings, tags };
    } catch (error) {
      console.error("Error fetching facets:", error);
      return null;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Filters books by genres, ratings, and tags
   * @param genres Array of genres to filter by
   * @param ratings Array of ratings to filter by
   * @param tags Array of tags to filter by
   * @param page Page number for pagination
   */
  async filterBooks(
    genres: string[],
    ratings: number[],
    tags: string[],
    page: number = 1
  ) {
    try {
      this.loading = true;
      this.error = null;

      const filters: string[] = [];

      if (genres.length > 0) {
        const genreFilters = genres
          .map((genre) => "genre:=" + genre)
          .join(" || ");
        filters.push("(" + genreFilters + ")");
      }

      if (ratings.length > 0) {
        const ratingFilters = ratings
          .map(
            (rating) =>
              "avgRating:>=" + rating + " && avgRating:<" + (rating + 1)
          )
          .join(" || ");
        filters.push("(" + ratingFilters + ")");
      }

      if (tags.length > 0) {
        const tagFilters = tags.map((tag) => "tags:=" + tag).join(" || ");
        filters.push("(" + tagFilters + ")");
      }

      // Search parameters for Typesense
      const searchParameters = {
        q: "*", // Match all documents
        query_by: "title", // Required field
        filter_by: filters.join(" && ") || "", // Apply filters if any
        facet_by: "genre, avgRating, tags", // Request facets for counts
        sort_by: "avgRating:desc", // Default sorting
        per_page: 20,
        page,
      };

      this.lastSearchParams = searchParameters;

      const results = await client
        .collections("books")
        .documents()
        .search(searchParameters);

      const newBooks = results.hits?.map((hit) => hit.document as Book) || [];
      this.updateBooksState(results, page, newBooks);
    } catch (error) {
      this.error = handleError(error).message;
      console.error("Error filtering books:", error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Loads more books based on the last search parameters
   */
  async loadMore() {
    if (!this.hasMoreResults || this.loading) return;

    const nextPage = this.currentPage + 1;
    const currentCount = this.books.length;

    if (this.lastSearchParams) {
      const params = { ...this.lastSearchParams, page: nextPage };

      if (params.filter_by) {
        await this.filterBooks([], [], [], nextPage);
      } else if (params.sort_by) {
        await this.sortBooks(params.sort_by.split(":")[0], nextPage);
      } else {
        await this.handleSearchResults(params.q, nextPage);
      }

      // If no new unique books were added, try loading the next page
      if (currentCount === this.books.length && this.hasMoreResults) {
        await this.loadMore();
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

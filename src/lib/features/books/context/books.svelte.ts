import type {
  Book,
  BookRating,
  RatedBook,
  SavedBook,
} from "$lib/types/books.type";
import { getContext, setContext } from "svelte";
import { db } from "$lib/services/firebase";
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
} from "firebase/firestore";
import { handleError } from "$lib/utils/errorHandling";
import { auth } from "$lib/services/firebase";

interface Pagination {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  lastVisible: any;
  pageSize: number;
}

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

      // Check if user has already rated this book
      const ratingRef = doc(db, "books", bookId, "ratings", currentUser.uid);
      const ratingDoc = await getDoc(ratingRef);
      const previousRating = ratingDoc.exists()
        ? (ratingDoc.data() as BookRating).ratingValue
        : 0;

      // Save rating to book's ratings subcollection
      await setDoc(ratingRef, bookRating);

      // Update the avgRating reactively in the UI without waiting for cloud function
      if (this.book && this.book.book.id === bookId) {
        // Calculate new average rating
        const currentAvgRating = this.book.book.avgRating || 0;
        let newAvgRating;

        if (currentAvgRating === 0) {
          // First rating
          newAvgRating = rating;
        } else if (previousRating > 0) {
          // User is updating their previous rating
          // Simple approach: adjust the average by removing old rating and adding new one
          // This is a simplified calculation for UI reactivity only
          newAvgRating = currentAvgRating - previousRating / 2 + rating / 2;
        } else {
          // New rating from this user
          newAvgRating = (currentAvgRating + rating) / 2;
        }

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
}

const BOOK_STATE_KEY = Symbol("BOOK_STATE");

export function setBookState() {
  return setContext(BOOK_STATE_KEY, new BookState());
}

export function getBookState() {
  return getContext<ReturnType<typeof setBookState>>(BOOK_STATE_KEY);
}

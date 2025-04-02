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
  totalBooks = $state<number>(0);
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

  async fetchBookById(id: string): Promise<RatedBook | null> {
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
      }

      return {
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
      const savedBookRef = doc(
        db,
        "users",
        currentUser.uid,
        "savedBooks",
        book.id
      );
      await setDoc(savedBookRef, savedBook);

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      console.error("Error saving book:", error);
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

      // Save rating to book's ratings subcollection
      await setDoc(ratingRef, bookRating);

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

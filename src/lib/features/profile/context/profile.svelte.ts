import type { Book, SavedBook } from "$lib/types/books.type";
import { auth, db } from "$lib/services/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  startAfter,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { handleError } from "$lib/utils/errorHandling";
import { getContext } from "svelte";
import { setContext } from "svelte";
import { toFirestoreTimestamp } from "$lib/utils/dateFormatting";
import type { UserRole } from "$lib/types/user.type";

interface Pagination {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  lastVisible: any;
  pageSize: number;
}

export class ProfileState {
  savedBooks = $state<SavedBook[]>([]);
  publishedBooks = $state<Book[]>([]);
  loading = $state<boolean>(false);
  error = $state<string | null>(null);
  role = $state<UserRole | null>(null);
  savedBooksPagination = $state<Pagination>({
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    lastVisible: null,
    pageSize: 10,
  });
  publishedBooksPagination = $state<Pagination>({
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    lastVisible: null,
    pageSize: 10,
  });

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

  async fetchPublishedBooks(loadMore = false) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return;
    }

    try {
      this.loading = true;
      this.error = null;

      const userId = auth.currentUser.uid;
      const booksRef = collection(db, "books");

      let booksQuery;

      if (loadMore && this.publishedBooksPagination.lastVisible) {
        booksQuery = query(
          booksRef,
          where("authorId", "==", userId),
          orderBy("publishedDate", "desc"),
          startAfter(this.publishedBooksPagination.lastVisible),
          limit(this.publishedBooksPagination.pageSize)
        );
      } else {
        // First load or refresh
        booksQuery = query(
          booksRef,
          where("authorId", "==", userId),
          orderBy("publishedDate", "desc"),
          limit(this.publishedBooksPagination.pageSize)
        );

        if (!loadMore) {
          this.publishedBooks = [];
          this.publishedBooksPagination.currentPage = 1;
        }
      }

      const snapshot = await getDocs(booksQuery);

      if (snapshot.empty && !loadMore) {
        this.publishedBooks = [];
        this.publishedBooksPagination.hasNextPage = false;
        return;
      }

      const books: Book[] = [];
      snapshot.forEach((doc) => {
        const bookData = doc.data() as Book;
        books.push({
          ...bookData,
          id: doc.id,
        });
      });

      // Update pagination
      this.publishedBooksPagination.lastVisible =
        snapshot.docs[snapshot.docs.length - 1];
      this.publishedBooksPagination.hasNextPage =
        books.length === this.publishedBooksPagination.pageSize;
      this.publishedBooksPagination.hasPreviousPage =
        this.publishedBooksPagination.currentPage > 1;

      if (loadMore) {
        this.publishedBooks = [...this.publishedBooks, ...books];
        this.publishedBooksPagination.currentPage += 1;
      } else {
        this.publishedBooks = books;
      }
    } catch (error) {
      this.error = handleError(error).message;
    } finally {
      this.loading = false;
    }
  }

  async publishBook(book: Omit<Book, "id">) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return null;
    }

    try {
      this.loading = true;
      this.error = null;

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

      // Refresh published books
      await this.fetchPublishedBooks();

      return docRef.id;
    } catch (error) {
      this.error = handleError(error).message;
      return null;
    } finally {
      this.loading = false;
    }
  }

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

      // Delete the book
      await deleteDoc(bookRef);

      // Note: Cloud function will handle removing from savedBooks collections

      // Refresh published books
      await this.fetchPublishedBooks();

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      return false;
    } finally {
      this.loading = false;
    }
  }

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

      // Refresh published books
      await this.fetchPublishedBooks();

      return true;
    } catch (error) {
      this.error = handleError(error).message;
      return false;
    } finally {
      this.loading = false;
    }
  }

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

const PROFILE_STATE_KEY = Symbol("PROFILE_STATE");

export function setProfileState() {
  return setContext(PROFILE_STATE_KEY, new ProfileState());
}

export function getProfileState() {
  return getContext<ReturnType<typeof setProfileState>>(PROFILE_STATE_KEY);
}

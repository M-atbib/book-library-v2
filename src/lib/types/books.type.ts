/**
 * Book Interface
 *
 * Represents a complete book entity in the application with all its metadata.
 * This interface is used for displaying book details, managing book collections,
 * and storing book data in Firestore.
 */
export interface Book {
  id: string; // Unique identifier for the book
  title: string; // Title of the book
  authorName: string; // Name of the book's author
  authorId: string; // Unique identifier for the author (Firebase user ID)
  coverUrl: string; // URL to the book's cover image in Firebase Storage
  avgRating: number; // Average rating of the book (1-5 scale)
  genre: string; // Primary genre of the book
  tags: string[]; // Array of tags/categories associated with the book
  publishedDate: Date; // Date when the book was published
  description: string; // Book description or summary
  pages: number; // Number of pages in the book
}

/**
 * BookRating Interface
 *
 * Represents a rating given to a book by a specific user.
 * Used for tracking individual user ratings and calculating average ratings.
 */
export interface BookRating {
  ratingValue: number; // Rating value (typically 1-5)
  userId: string; // ID of the user who provided the rating
}

/**
 * SavedBook Interface
 *
 * Represents a simplified version of a book that a user has saved to their collection.
 * Contains only essential information needed for displaying in saved/favorite lists.
 */
export interface SavedBook {
  id: string; // Unique identifier for the book
  title: string; // Title of the book
  authorName: string; // Name of the book's author
  coverUrl: string; // URL to the book's cover image
  avgRating: number; // Average rating of the book
  genre: string; // Primary genre of the book
  tags: string[]; // Array of tags/categories associated with the book
}

/**
 * RatedBook Interface
 *
 * Combines a book with its specific rating from a user.
 * Used for displaying books with their user-specific ratings in the UI.
 */
export interface RatedBook {
  book: Book; // The complete book object
  rating: BookRating; // The rating given to the book by a specific user
}

import type { Timestamp } from "firebase/firestore";

/**
 * Represents the possible roles a user can have in the application.
 * - author: Can create and manage books
 * - reader: Can read and interact with books
 */
export type UserRole = "author" | "reader";

/**
 * Represents a user in the application.
 * This interface defines the core user data structure stored in Firestore.
 */
export interface User {
  /** Unique identifier for the user, matches Firebase Authentication UID */
  uid: string;
  /** The display name of the user */
  displayName: string;
  /** The email address of the user */
  email: string;
  /** Timestamp when the user account was created */
  createdAt: Timestamp;
  /** Timestamp when the user account was last updated */
  updatedAt: Timestamp;
}

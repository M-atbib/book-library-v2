import type { Timestamp } from "firebase/firestore";

export type UserRole = "author" | "reader";

export interface User {
  uid: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

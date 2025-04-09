/**
 * Auth Context Module
 *
 * This module provides a Svelte context for managing authentication-related state and operations.
 * It handles user authentication, registration, profile management, and role-based access control
 * using Firebase Authentication and Firestore.
 */

import { auth, db } from "$lib/services/firebase";
import type { User, UserRole } from "$lib/types/user.type";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  updateProfile,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { getContext } from "svelte";
import { setContext } from "svelte";
import { handleError } from "$lib/utils/errorHandling";
import { httpsCallable } from "firebase/functions";
import { functions } from "$lib/services/firebase";
import { goto } from "$app/navigation";

const googleProvider = new GoogleAuthProvider();
const setUserRoleFunction = httpsCallable(functions, "authCustomClaims");

/**
 * UserState class that manages all authentication-related state and operations
 */
export class UserSate {
  user = $state<User | null>(null);
  role = $state<string>("");
  error = $state<string | null>(null);
  loading = $state<boolean>(false);

  /**
   * Sets the current user
   * @param user User object to set as current user
   */
  setUser(user: User) {
    this.user = user;
  }

  /**
   * Creates a new user document in Firestore after registration
   * @param user Firebase user object
   * @param role User role to assign
   */
  async createUserInFirestore(user: FirebaseUser, role: UserRole) {
    try {
      const userRef = doc(db, "users", user.uid);
      const newUser: User = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "",
        email: user.email || "",
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      await setDoc(userRef, newUser);
      await setUserRoleFunction({ role });
      this.user = newUser;
    } catch (error) {
      console.error("Error creating user in Firestore:", error);
      throw error;
    }
  }

  /**
   * Fetches the current user's data from Firestore
   * @returns User object or null if not found
   */
  async getUser() {
    try {
      if (!this.user) return null;

      const userDocRef = doc(db, "users", this.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return null;
      }

      this.user = userDoc.data() as User;
    } catch (error) {
      console.error("Error fetching user from Firestore:", error);
      return null;
    }
  }

  /**
   * Retrieves the current user's role from Firebase Auth claims
   * @returns User role or null if not authenticated
   */
  async getRole() {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const idTokenResult = await user.getIdTokenResult();
      this.role = idTokenResult.claims.role as UserRole;
    } catch (error) {
      console.error("Error getting user role:", error);
      return null;
    }
  }

  /**
   * Handles errors in a consistent way across auth operations
   * @param error Error object
   * @param context Description of where the error occurred
   */
  private handleStateError(error: unknown, context: string) {
    const appError = handleError(error);
    this.error = appError.message;
    console.error(`${context}:`, appError);
    throw appError;
  }

  /**
   * Authenticates a user with email and password
   * @param email User's email
   * @param password User's password
   */
  async loginWithEmailAndPassword(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      this.error = null;
      goto("/books");
    } catch (error) {
      this.handleStateError(error, "Login failed");
    }
  }

  /**
   * Registers a new user with email and password
   * @param email User's email
   * @param password User's password
   * @param role User's role
   */
  async registerWithEmailAndPassword(
    email: string,
    password: string,
    role: UserRole
  ) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await this.createUserInFirestore(userCredential.user, role);
      this.error = null;
      goto("/books");
    } catch (error) {
      this.handleStateError(error, "Registration failed");
    }
  }

  /**
   * Authenticates a user with Google OAuth
   * @param role User's role (for new users)
   */
  async loginWithGoogle(role: UserRole) {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);

      // Check if this is a new user (sign up) or existing user (sign in)
      const isNewUser =
        userCredential.user.metadata.creationTime ===
        userCredential.user.metadata.lastSignInTime;

      // If this is a new user, create their document in Firestore
      if (isNewUser) {
        await this.createUserInFirestore(userCredential.user, role);
      }
      goto("/books");
    } catch (error) {
      console.error("Error with Google authentication:", error);
      throw error;
    }
  }

  /**
   * Signs out the current user
   */
  async logout() {
    try {
      await signOut(auth);
      goto("/");
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  }

  /**
   * Updates the user's profile information
   * @param email New email address
   * @param displayName New display name
   * @param password New password (optional)
   */
  async updateInfo(email: string, displayName: string, password?: string) {
    if (!auth.currentUser) {
      this.error = "User not authenticated";
      return;
    }

    try {
      this.loading = true;
      this.error = null;

      const userId = auth.currentUser.uid;
      const userRef = doc(db, "users", userId);

      // Update user document in Firestore
      await updateDoc(userRef, {
        email,
        displayName,
        updatedAt: new Date(),
      });

      if (displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: displayName,
        });
      }

      // Update Firebase Auth email if changed
      if (email !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, email);
      }

      // Update password if provided
      if (password && password.trim() !== "") {
        await updatePassword(auth.currentUser, password);
      }
      this.user = {
        uid: userId,
        email,
        displayName,
        createdAt: this.user?.createdAt || (serverTimestamp() as Timestamp),
        updatedAt: serverTimestamp() as Timestamp,
      };
    } catch (error) {
      this.error = handleError(error).message;
    } finally {
      this.loading = false;
    }
  }
}

/**
 * Symbol key for the user state context
 */
const USER_STATE_KEY = Symbol("USER_STATE");

/**
 * Creates and sets the user state context
 * @returns UserState instance
 */
export function setUserState() {
  return setContext(USER_STATE_KEY, new UserSate());
}

/**
 * Retrieves the user state from context
 * @returns UserState instance
 */
export function getUserState() {
  return getContext<ReturnType<typeof setUserState>>(USER_STATE_KEY);
}

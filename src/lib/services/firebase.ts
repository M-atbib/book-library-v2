/**
 * Firebase Service Module
 *
 * This module initializes and exports Firebase services used throughout the application.
 * It configures Firebase with environment variables (with fallbacks for development)
 * and provides centralized access to Firebase Authentication, Firestore Database,
 * Cloud Functions, and Storage services.
 *
 * The module handles:
 * - Firebase app initialization with proper configuration
 * - Authentication service for user management
 * - Firestore database for data storage and retrieval
 * - Cloud Functions for serverless backend operations
 * - Storage service for file uploads and management
 *
 * Environment variables are used to support different Firebase projects
 * across development, staging, and production environments.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

/**
 * Firebase configuration object
 * Uses environment variables with fallbacks for development
 */
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDMtlw7U-4YIjPxM4xgBv09HoxJGLE-KH8",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "book-library-863ac.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "book-library-863ac",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "book-library-863ac.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "611595985135",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:611595985135:web:ec6563cbf210b52d78bb1a",
};

// Initialize Firebase application
export const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app); // Authentication service
export const functions = getFunctions(app); // Cloud Functions service
export const db = getFirestore(app); // Firestore Database service
export const storage = getStorage(app); // Storage service for files

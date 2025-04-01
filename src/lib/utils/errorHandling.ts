import type { FirebaseError } from "firebase/app";

export type ErrorType = "auth" | "firestore" | "storage" | "general";

interface ErrorDetails {
  message: string;
  type: ErrorType;
  code?: string;
  originalError?: unknown;
}

export class AppError extends Error {
  type: ErrorType;
  code?: string;
  originalError?: unknown;

  constructor({ message, type, code, originalError }: ErrorDetails) {
    super(message);
    this.type = type;
    this.code = code;
    this.originalError = originalError;
    this.name = "AppError";
  }
}

const firebaseErrorMessages: Record<string, string> = {
  // Auth errors
  "auth/email-already-in-use": "This email is already registered.",
  "auth/invalid-email": "Invalid email address.",
  "auth/operation-not-allowed": "Operation not allowed.",
  "auth/weak-password": "Password is too weak.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/popup-closed-by-user": "Sign in was cancelled.",

  // Firestore errors
  "permission-denied": "You don't have permission to perform this action.",
  "not-found": "The requested document was not found.",

  // Add more error codes as needed
};

export function handleError(error: unknown): AppError {
  console.error("Original error:", error);

  if (isFirebaseError(error)) {
    return handleFirebaseError(error);
  }

  if (error instanceof AppError) {
    return error;
  }

  return new AppError({
    message:
      error instanceof Error ? error.message : "An unexpected error occurred",
    type: "general",
    originalError: error,
  });
}

function isFirebaseError(error: unknown): error is FirebaseError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as FirebaseError).code === "string"
  );
}

function handleFirebaseError(error: FirebaseError): AppError {
  const type = error.code.split("/")[0] as ErrorType;
  const message = firebaseErrorMessages[error.code] || error.message;

  return new AppError({
    message,
    type,
    code: error.code,
    originalError: error,
  });
}

export function getErrorMessage(error: unknown): string {
  const appError = error instanceof AppError ? error : handleError(error);
  return appError.message;
}

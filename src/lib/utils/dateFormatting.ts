import { Timestamp } from "firebase/firestore";

/**
 * Formats a Firestore timestamp into a readable date string
 * @param timestamp - Firestore timestamp or Date object
 * @param format - Optional format style ('full', 'long', 'medium', 'short')
 * @returns Formatted date string
 */
export function formatDate(
  timestamp: Timestamp | Date | null | undefined,
  format: "full" | "long" | "medium" | "short" = "medium"
): string {
  if (!timestamp) return "";

  // Convert Firestore Timestamp to Date if needed
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;

  try {
    return new Intl.DateTimeFormat("en-US", getFormatOptions(format)).format(
      date
    );
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

/**
 * Converts a Date object or string to a Firestore Timestamp
 * @param date - Date object, ISO string, or date string
 * @returns Firestore Timestamp or null if invalid input
 * 
 * Example output format: 1 April 2025 at 14:36:01 UTC
 */
export function toFirestoreTimestamp(
  date: Date | string | null | undefined
): Timestamp | null {
  if (!date) return null;

  try {
    // If it's already a Date object, use it directly
    // Otherwise, try to create a Date from the string
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.error("Invalid date provided to toFirestoreTimestamp");
      return null;
    }
    
    // Create a Firestore Timestamp from the Date object
    // This will automatically format as: 1 April 2025 at 14:36:01 UTC when stored in Firestore
    return Timestamp.fromDate(dateObj);
  } catch (error) {
    console.error("Error converting to Firestore timestamp:", error);
    return null;
  }
}

/**
 * Get date format options based on the requested format style
 */
function getFormatOptions(
  format: "full" | "long" | "medium" | "short"
): Intl.DateTimeFormatOptions {
  switch (format) {
    case "full":
      return {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      };
    case "long":
      return {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
    case "short":
      return {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      };
    case "medium":
    default:
      return {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
  }
}

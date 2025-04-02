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

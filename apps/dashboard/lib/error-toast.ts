import { toast } from "sonner";

/**
 * Helper function to display error toast messages
 * Extracts error message from various error types
 */
export function showErrorToast(error: unknown, fallbackMessage: string): void {
  if (error instanceof Error) {
    toast.error(error.message);
  } else if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    // Handle Axios-like error responses
    toast.error(error.response.data.message);
  } else {
    toast.error(fallbackMessage);
  }
}

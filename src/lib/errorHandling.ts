export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "object" && error !== null) {
    const payload = error as ApiErrorPayload;
    if (payload.error) return payload.error;
    if (payload.message) return payload.message;
  }

  return fallback;
}

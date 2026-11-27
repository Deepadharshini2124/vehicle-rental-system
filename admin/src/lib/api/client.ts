import {
  getAdminToken,
  clearAdminSession,
} from "./session";

// API base URL
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

// Common API error response
type ApiErrorResponse = {
  success?: boolean;
  message?: string;
};

// Generic API request
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);

  // Set JSON content type automatically.
  if (
    options.body &&
    !headers.has("Content-Type") &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  // Attach authentication token.
  const authToken = token || getAdminToken();

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const isAuthEndpoint =
    endpoint === "/api/auth/login" ||
    endpoint === "/api/auth/register";

  let response: Response;

  // Send API request.
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new Error(
      "Unable to connect to the server. Check whether the backend is running."
    );
  }

  // Parse server response.
  const responseText = await response.text();

  let data: unknown;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    if (response.status === 401 && !isAuthEndpoint) {
      clearAdminSession();

      throw new Error(
        "Session expired. Please login again."
      );
    }

    throw new Error(
      "Invalid response received from server"
    );
  }

  const errorData =
    data && typeof data === "object"
      ? (data as ApiErrorResponse)
      : null;

  // Handle unauthorized requests.
  if (response.status === 401) {
    if (isAuthEndpoint) {
      throw new Error(
        errorData?.message || "Invalid login credentials"
      );
    }

    clearAdminSession();

    throw new Error(
      "Session expired. Please login again."
    );
  }

  // Handle forbidden requests.
  if (response.status === 403) {
    throw new Error(
      errorData?.message || "Access denied"
    );
  }

  // Handle API errors.
  if (!response.ok || errorData?.success === false) {
    throw new Error(
      errorData?.message || `API Error: ${response.status}`
    );
  }

  // Validate response structure.
  if (data === null || typeof data !== "object") {
    throw new Error("Invalid API response");
  }

  return data as T;
}
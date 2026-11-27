import {
  getCustomerToken,
  clearCustomerSession,
} from "./session";

// ==========================================
// API CONFIGURATION
// ==========================================

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

const PUBLIC_ENDPOINTS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/verify-otp",
  "/api/auth/reset-password",
  "/api/settings/public",
  "/api/locations/public",
]);

// ==========================================
// COMMON API REQUEST
// ==========================================

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  const isPublic = PUBLIC_ENDPOINTS.has(
    endpoint.split("?")[0]
  );

  const token = getCustomerToken();

  // Configure content type

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  headers.set("Accept", "application/json");

  // Configure authentication

  if (isPublic) {
    headers.delete("Authorization");
  } else if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  let response: Response;

  // Send API request

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
        cache: "no-store",
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new Error(
      "Unable to connect to the server. Please check whether the backend is running."
    );
  }

  // Handle expired customer session

  if (
    response.status === 401 &&
    !isPublic
  ) {
    if (getCustomerToken() === token) {
      clearCustomerSession();
    }

    throw new Error(
      "Session expired. Please login again."
    );
  }

  let data;

  // Parse API response

  try {
    data = await response.json();
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new Error(
      `Invalid server response (${response.status})`
    );
  }

  // Handle authentication errors

  if (response.status === 401) {
    throw new Error(
      data?.message ||
        "Authentication failed"
    );
  }

  // Handle API errors

  if (
    !response.ok ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        `API request failed (${response.status})`
    );
  }

  // Validate response structure

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error(
      "Invalid API response"
    );
  }

  return data as T;
}

// ==========================================
// JSON API REQUEST
// ==========================================

export function jsonRequest<T>(
  endpoint: string,
  method: "POST" | "PUT" | "PATCH",
  body: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method,
    body: JSON.stringify(body),
  });
}
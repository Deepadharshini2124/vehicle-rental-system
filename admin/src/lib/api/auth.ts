import { apiRequest } from "./client";

import {
  saveAdminSession,
  clearAdminSession,
} from "./session";

import type { LoginResponse } from "./types";

// Admin login
export async function adminLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    }
  );

  // Validate login response
  if (
    !response.success ||
    typeof response.token !== "string" ||
    !response.token.trim() ||
    !response.user
  ) {
    throw new Error(
      response.message || "Login failed"
    );
  }

  // Only administrators can access the admin panel
  if (response.user.role !== "admin") {
    throw new Error(
      "Only administrators can access this panel"
    );
  }

  // Save authenticated admin session
  saveAdminSession(response.token, response.user);

  return response;
}

// Admin logout
export function adminLogout(): void {
  clearAdminSession();
}
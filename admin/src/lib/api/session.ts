import type { AdminUser } from "./types";

// Session storage keys
const TOKEN_KEY = "adminToken";
const USER_KEY = "adminUser";

// Get admin token
export function getAdminToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(TOKEN_KEY);
}

// Save admin session
export function saveAdminSession(
  token: string,
  user: AdminUser
): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Clear admin session
export function clearAdminSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

// Get logged-in admin
export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = sessionStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AdminUser;
  } catch {
    return null;
  }
}
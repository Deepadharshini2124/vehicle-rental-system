
import type { CustomerUser } from "./types";

const CUSTOMER_SESSION_EVENT = "customer-session-updated";

export function getCustomerToken(): string | null {
  return typeof window === "undefined"
    ? null
    : sessionStorage.getItem("customerToken");
}

export function getCustomerUser(): CustomerUser | null {
  if (typeof window === "undefined") return null;

  try {
    const user = sessionStorage.getItem("customerUser");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function notifyCustomerSessionUpdate() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(CUSTOMER_SESSION_EVENT));
}

export function saveCustomerSession(token: string, user: CustomerUser): void {
  if (typeof window === "undefined") return;

  sessionStorage.setItem("customerToken", token);
  sessionStorage.setItem("customerUser", JSON.stringify(user));
  notifyCustomerSessionUpdate();
}

export function clearCustomerSession(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem("customerToken");
  sessionStorage.removeItem("customerUser");
  notifyCustomerSessionUpdate();
}

export function requireCustomerToken(message: string): string {
  const token = getCustomerToken();
  if (!token) throw new Error(message);
  return token;
}

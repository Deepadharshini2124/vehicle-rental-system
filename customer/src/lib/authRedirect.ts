const DEFAULT_REDIRECT = "/home";

const ALLOWED_PATHS = new Set([
  "/booking",
  "/my-bookings",
  "/profile",
  "/home",
  "/vehicles",
]);

export function getSafeRedirect(
  value: string | null | undefined
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return DEFAULT_REDIRECT;
  }

  try {
    const base = "https://internal.invalid";
    const url = new URL(value, base);

    if (url.origin !== base) {
      return DEFAULT_REDIRECT;
    }

    if (!ALLOWED_PATHS.has(url.pathname)) {
      return DEFAULT_REDIRECT;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

export function getLoginUrl(
  destination: string
): string {
  const next = getSafeRedirect(destination);

  const query = new URLSearchParams({
    next,
  });

  return `/login?${query.toString()}`;
}
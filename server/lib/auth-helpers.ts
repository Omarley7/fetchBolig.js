import type { Context } from "hono";

/**
 * Extracts and validates the authentication cookies from the request header
 * @param c - Hono context object
 * @returns The cookies string or null if not found
 */
export function extractCookies(c: Context): string | null {
  return c.req.header("x-findbolig-cookies") || null;
}

/**
 * Validates that cookies are present and returns 401 if not
 * @param c - Hono context object
 * @returns The cookies string or a 401 response if not found
 */
export function requireAuth(c: Context): string | Response {
  const cookies = extractCookies(c);
  if (!cookies) {
    return c.json({ error: "Authentication required" }, 401);
  }
  return cookies;
}

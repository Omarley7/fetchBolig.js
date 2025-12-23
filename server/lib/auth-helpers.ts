import type { Context } from "hono";

/**
 * Validates that cookies are present and returns 401 if not
 * @param c - Hono context object
 * @returns The cookies string or a 401 response if not found
 */
export function requireAuth(c: Context): string | Response {
  const cookies = c.req.header("x-findbolig-cookies");
  if (!cookies) {
    return c.json({ error: "Authentication required" }, 401);
  }
  return cookies;
}

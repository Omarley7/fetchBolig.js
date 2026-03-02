import * as Iron from "iron-webcrypto";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";

const crypto = globalThis.crypto;

export interface SealedSession {
  fbCookies: string;
  fbEmail: string;
  fbPassword: string;
  fullName: string;
  email: string;
}

const COOKIE_NAME = "session";
const COOKIE_SECRET = process.env.COOKIE_SECRET;

if (!COOKIE_SECRET || COOKIE_SECRET.length < 32) {
  throw new Error("COOKIE_SECRET must be set and at least 32 characters long");
}

const SEAL_OPTIONS: Iron.SealOptions = {
  ...Iron.defaults,
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function sealSession(session: SealedSession): Promise<string> {
  return Iron.seal(crypto, session, COOKIE_SECRET!, SEAL_OPTIONS);
}

export async function unsealSession(sealed: string): Promise<SealedSession> {
  return Iron.unseal(crypto, sealed, COOKIE_SECRET!, SEAL_OPTIONS) as Promise<SealedSession>;
}

export async function getSessionFromCookie(c: Context): Promise<SealedSession | null> {
  const sealed = getCookie(c, COOKIE_NAME);
  if (!sealed) return null;
  try {
    return await unsealSession(sealed);
  } catch {
    return null;
  }
}

export async function setSessionCookie(c: Context, session: SealedSession, remember: boolean = true): Promise<void> {
  const sealed = await sealSession(session);
  const isProduction = process.env.NODE_ENV === "production";
  setCookie(c, COOKIE_NAME, sealed, {
    path: "/api",
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    ...(remember ? { maxAge: 7 * 24 * 60 * 60 } : {}), // session cookie if not "remember me"
  });
}

export async function clearSessionCookie(c: Context): Promise<void> {
  deleteCookie(c, COOKIE_NAME, { path: "/api" });
}

/**
 * Parse raw Set-Cookie headers into a Cookie header string.
 * e.g. ["name=val; Path=/; HttpOnly", "foo=bar; Secure"] -> "name=val; foo=bar"
 */
export function parseCookies(setCookieHeaders: string[]): string {
  return setCookieHeaders
    .filter((h) => typeof h === "string" && h.length > 0)
    .map((h) => {
      const match = h.match(/^([^;]+)/);
      return match ? match[1].trim() : "";
    })
    .filter(Boolean)
    .join("; ");
}

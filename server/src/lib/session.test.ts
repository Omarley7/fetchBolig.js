import { test } from "node:test";
import assert from "node:assert/strict";

// session.ts throws at import time unless COOKIE_SECRET is set.
process.env.COOKIE_SECRET ||= "x".repeat(32);
const { parseCookies } = await import("./session");

// The real Set-Cookie sequence findbolig.nu (ASP.NET Core / Kestrel) returns on login:
// the auth ticket is set AND a same-name deletion is emitted in the same response,
// alongside deletions for the external/preview cookies.
const LOGIN_SET_COOKIES = [
  "shell#lang=da; path=/; secure; samesite=lax",
  "__Secure-SID=abc123def456ghi789jkl012; path=/; secure; httponly",
  ".AspNet.Cookies=REAL_AUTH_TICKET_VALUE_432; path=/; secure; httponly; samesite=lax",
  ".AspNet.Cookies=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/",
  ".AspNet.ExternalCookie=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/",
  ".AspNet.Cookies.Preview=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/",
];

test("keeps the real auth cookie and drops the same-name deletion (no duplicate names)", () => {
  const header = parseCookies(LOGIN_SET_COOKIES);
  const names = header.split("; ").map((c) => c.split("=")[0]);

  // .AspNet.Cookies must appear exactly once...
  assert.equal(
    names.filter((n) => n === ".AspNet.Cookies").length,
    1,
    `duplicate/missing .AspNet.Cookies in: ${header}`,
  );
  // ...with the real value, never the empty deletion.
  assert.ok(
    header.includes(".AspNet.Cookies=REAL_AUTH_TICKET_VALUE_432"),
    `real auth value missing in: ${header}`,
  );
  assert.ok(!/\.AspNet\.Cookies=(;|$)/.test(header), `empty .AspNet.Cookies present in: ${header}`);
});

test("drops empty/deletion cookies entirely", () => {
  const header = parseCookies(LOGIN_SET_COOKIES);
  assert.ok(!header.includes(".AspNet.ExternalCookie"), header);
  assert.ok(!header.includes(".AspNet.Cookies.Preview"), header);
});

test("a non-deletion value wins regardless of order", () => {
  const header = parseCookies([
    ".AspNet.Cookies=; expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ".AspNet.Cookies=GOODVALUE; path=/",
  ]);
  assert.equal(header, ".AspNet.Cookies=GOODVALUE");
});

test("ordinary single cookies are preserved", () => {
  const header = parseCookies([
    "a=1; path=/",
    "b=2; secure; httponly",
  ]);
  assert.equal(header, "a=1; b=2");
});

# Sealed HttpOnly Cookie Auth

## Problem

Authentication with findbolig.nu is handled insecurely:

- Plaintext password stored in localStorage (when "Remember Password" is checked)
- findbolig session cookies stored in localStorage, accessible to any JS
- Sensitive cookies sent via custom `x-findbolig-cookies` header (visible in DevTools)
- `NODE_TLS_REJECT_UNAUTHORIZED=0` disables TLS verification on the server
- Any XSS vulnerability or malicious extension can steal all credentials

## Solution

Replace client-side credential storage with a server-sealed HttpOnly cookie. The server encrypts all session data (findbolig cookies + credentials for auto-reauth) using `iron-webcrypto` and sets it as an HttpOnly cookie. Client JS never sees secrets.

## Architecture

```
LOGIN:
  Client POST /api/auth/login {email, password, credentials:'include'}
    -> Server authenticates with findbolig.nu
    -> Server seals {fbCookies, fbEmail, fbPassword, fullName, email}
    -> Set-Cookie: session=Fe26.2**...; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=604800
    -> Response body: {fullName, email} (no secrets)

API CALLS:
  Client GET /api/appointments/upcoming {credentials:'include'}
    -> Browser auto-sends session cookie
    -> Server unseals -> extracts fbCookies -> forwards to findbolig.nu
    -> If findbolig returns 401: unseal credentials -> re-login -> update cookie -> retry
    -> Response + updated Set-Cookie if cookies changed

KEEP-ALIVE:
  Client GET /api/auth/refresh {credentials:'include'} every 3 min
    -> Server unseals -> pings findbolig /api/users/me
    -> Re-seals with any updated cookies
    -> Returns {fullName, email} + updated Set-Cookie

LOGOUT:
  Client POST /api/auth/logout {credentials:'include'}
    -> Server clears the cookie (Max-Age=0)
```

## Sealed cookie payload

```typescript
interface SealedSession {
  fbCookies: string;    // findbolig.nu session cookies
  fbEmail: string;      // for auto-reauth when fb session expires
  fbPassword: string;   // for auto-reauth
  fullName: string;     // display name
  email: string;        // display email
}
```

Estimated ~500 bytes after encryption. Well within the 4KB cookie limit.

## Cookie attributes

| Attribute | Value | Reason |
|-----------|-------|--------|
| HttpOnly | true | Prevents JS access (XSS protection) |
| Secure | true (prod) / false (dev) | Requires HTTPS in production |
| SameSite | Lax | Prevents CSRF while allowing navigation |
| Path | /api | Cookie only sent for API requests |
| Max-Age | 604800 (7 days) | Session lifetime |

## Dev environment

In dev, Vite (`:5173`) and the server (`:3000`) are different origins. Requirements:

- CORS middleware with `credentials: true` and explicit allowed origins
- All client fetches use `credentials: 'include'`

In production (same Cloud Run instance), same-origin so no CORS needed.

## Files changed

### Server

| File | Change |
|------|--------|
| `server/package.json` | Add `iron-webcrypto` |
| `server/src/lib/session.ts` | **New**: seal/unseal helpers, cookie config, `COOKIE_SECRET` validation |
| `server/src/lib/auth-helpers.ts` | Read session from cookie instead of `x-findbolig-cookies` header |
| `server/src/index.ts` | Update login/refresh routes, add logout route, add CORS credentials config, add auto-reauth on 401 |
| `server/src/findbolig-service.ts` | Remove `NODE_TLS_REJECT_UNAUTHORIZED = "0"` |
| `server/.env` | Add `COOKIE_SECRET` |

### Client

| File | Change |
|------|--------|
| `client/src/composables/useAuth.ts` | Remove `cookies`/`password` refs, add `credentials: 'include'`, simplify persist to `["isAuthenticated", "name", "email"]` |
| `client/src/data/appointmentsSource.ts` | Remove `x-findbolig-cookies` header, add `credentials: 'include'` |

## Security improvements

| Before | After |
|--------|-------|
| Plaintext password in localStorage | Never reaches client JS |
| findbolig cookies in localStorage | Encrypted in HttpOnly cookie |
| `x-findbolig-cookies` header visible in DevTools | Standard HttpOnly cookie, invisible to JS |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` | Removed |
| XSS can steal all credentials | XSS cannot read HttpOnly cookies |

## Dependencies

- `iron-webcrypto` (~1.6M weekly downloads, used by iron-session/Next.js)
- Uses Web Crypto API (standard, works in Node.js, Deno, Bun, edge runtimes)

## Environment variables

- `COOKIE_SECRET`: 32+ character random string for iron-webcrypto encryption. Required.

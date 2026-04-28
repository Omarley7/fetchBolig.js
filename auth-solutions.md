# Authentication & Session Handling — Solution Options

## Current State

### How auth works today

```
┌─────────┐    x-findbolig-cookies    ┌──────────────┐    Cookie header    ┌───────────────┐
│  Client  │ ────────────────────────► │ Hono Backend │ ──────────────────► │ findbolig.nu  │
│ (Vue 3)  │ ◄──────────────────────── │ (Cloud Run)  │ ◄────────────────── │  (Sitecore)   │
└─────────┘    UserData + cookies[]    └──────────────┘    Set-Cookie       └───────────────┘
```

1. **Login**: Client sends email/password → Backend POSTs to `findbolig.nu/api/authentication/login` → receives `Set-Cookie` headers (`.ASPXAUTH`, `__Secure-SID`) → returns them to the client as a string array.
2. **Authenticated requests**: Client sends findbolig cookies via `x-findbolig-cookies` header → Backend forwards them as a `Cookie` header to findbolig.nu.
3. **Session keep-alive**: Client-side `setInterval` every 5 minutes calls `GET /api/auth/refresh` → Backend hits `findbolig.nu/api/users/me` → returns updated cookies if any.
4. **Storage**: Pinia store with `pinia-plugin-persistedstate` saves cookies, email, name, and optionally password to `localStorage`.

### What `ensureSession()` already solves

The `ui-polish-and-fixes` branch added `validateSession()` and `ensureSession()` to `useAuth.ts`:

```typescript
async function ensureSession(): Promise<boolean> {
  // 1. Try existing session first
  if (cookies.value) {
    const valid = await validateSession();
    if (valid) return true;
  }
  // 2. Session invalid — try auto-relogin if credentials are remembered
  if (rememberPassword.value && email.value && password.value) {
    const ok = await login(email.value, password.value);
    return !!ok;
  }
  // 3. No stored credentials — user must log in manually
  return false;
}
```

This handles the "session expired while tab was open" case — if the user opted into "Remember Password", the app auto-re-authenticates without prompting.

### Remaining pain points

| Problem | Impact |
|---------|--------|
| **Password stored as plaintext in localStorage** | Any XSS vulnerability or browser extension can read it. Security-conscious users may not trust this. |
| **Client holds findbolig session cookies** | Cookies are visible in DevTools, localStorage, and any JS running on the page. |
| **Tab closed = session lost** | findbolig cookies expire after ~20 minutes. User reopens tab → must re-login (or auto-relogin with stored password). |
| **No server-side resilience** | Backend is fully stateless — if the client loses cookies, the session is gone. No way to recover without re-authenticating. |
| **Keep-alive only runs while tab is open** | Background tabs get throttled by browsers. If the user leaves for 30+ minutes, the session will expire. |

---

## Option 1: Client-Side Improvements Only

**Philosophy**: Enhance what's already there. No backend changes. Stay on Cloud Run as-is.

### Changes

#### 1a. Refresh on tab focus (Page Visibility API)

```typescript
// useAuth.ts — add inside the store setup
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && isAuthenticated.value) {
    const valid = await validateSession();
    if (!valid) await ensureSession();
  }
});
```

When the user switches back to the tab, immediately check if the session is still alive. If not, try auto-relogin.

#### 1b. Use `ensureSession()` as a guard before every API call

```typescript
// client/src/data/appointmentsSource.ts
export async function fetchAppointments(auth: ReturnType<typeof useAuth>) {
  const sessionOk = await auth.ensureSession();
  if (!sessionOk) throw new Error("Session expired — please log in again.");

  const res = await fetch(`${config.backendDomain}/api/appointments/upcoming`, {
    headers: { "x-findbolig-cookies": auth.cookies },
  });
  // ...
}
```

#### 1c. Reduce keep-alive interval

Change from 5 minutes to 3 minutes (Sitecore default timeout is ~20 min, so 3 min gives plenty of margin with sliding expiration):

```typescript
keepAliveTimer = window.setInterval(async () => {
  // ...
}, 3 * 60 * 1000); // 3 minutes
```

### Pros

- **Minimal effort** — a few hours of work, no infrastructure changes.
- **No new dependencies** — no database, no encryption libraries.
- **Cloud Run stays as-is** — no cost increase, no new services.
- **`ensureSession()` already does the heavy lifting** — just needs to be wired in.

### Cons

- **Password is still plaintext in localStorage** — the fundamental security concern remains. Any XSS or malicious extension can steal it.
- **Client is still the session authority** — the browser is the only place cookies and credentials live.
- **Keep-alive is unreliable** — browsers throttle `setInterval` in background tabs (Chrome: once per minute max). A 20-minute findbolig timeout can still be missed.
- **No transparency story** — hard to tell users "your credentials are safe" when they're in plaintext localStorage.

### Best for

Quick improvement while deciding on a more robust solution. Good as a **Phase 1** before implementing Option 2 or 3.

---

## Option 2: Server-Side Session Store + Auto Re-Auth

**Philosophy**: Move session state and credentials to the server. Client gets a session token and never touches findbolig cookies or credentials directly. Stay on Cloud Run.

### Architecture

```
┌─────────┐   session token (JWT)   ┌──────────────┐    Cookie header    ┌───────────────┐
│  Client  │ ──────────────────────► │ Hono Backend │ ──────────────────► │ findbolig.nu  │
│ (Vue 3)  │ ◄────────────────────── │ (Cloud Run)  │ ◄────────────────── │  (Sitecore)   │
└─────────┘   JSON responses only    └──────┬───────┘    Set-Cookie       └───────────────┘
                                            │
                                     ┌──────▼───────┐
                                     │  Firestore   │
                                     │  (or Redis)  │
                                     │              │
                                     │ • fb cookies  │
                                     │ • encrypted   │
                                     │   credentials │
                                     │ • lastActive  │
                                     └──────────────┘
```

### How it works

1. **Login**: Client sends email/password → Server authenticates with findbolig.nu → Server stores findbolig cookies + AES-encrypted credentials in Firestore → Server returns a signed JWT (or sets an HttpOnly cookie) to the client.
2. **Authenticated requests**: Client sends JWT → Server looks up findbolig cookies from Firestore → forwards to findbolig.nu. Client never sees findbolig cookies.
3. **401 from findbolig**: Server catches it → decrypts stored credentials → re-authenticates with findbolig.nu → updates stored cookies → retries the original request. Transparent to client.
4. **Logout**: Server deletes the session from Firestore, clears findbolig cookies.

### Code examples

#### Server: Session store abstraction

```typescript
// server/src/lib/session-store.ts
import { Firestore } from "@google-cloud/firestore";
import { encrypt, decrypt } from "./crypto";

const db = new Firestore();
const sessions = db.collection("sessions");

interface StoredSession {
  findboligCookies: string;
  encryptedEmail: string;
  encryptedPassword: string;
  lastActive: number;
}

export async function createSession(sessionId: string, data: {
  cookies: string;
  email: string;
  password: string;
}) {
  await sessions.doc(sessionId).set({
    findboligCookies: data.cookies,
    encryptedEmail: encrypt(data.email),
    encryptedPassword: encrypt(data.password),
    lastActive: Date.now(),
  });
}

export async function getSession(sessionId: string): Promise<StoredSession | null> {
  const doc = await sessions.doc(sessionId).get();
  return doc.exists ? (doc.data() as StoredSession) : null;
}

export async function updateCookies(sessionId: string, cookies: string) {
  await sessions.doc(sessionId).update({
    findboligCookies: cookies,
    lastActive: Date.now(),
  });
}

export async function deleteSession(sessionId: string) {
  await sessions.doc(sessionId).delete();
}
```

#### Server: Login route with session creation

```typescript
// server/src/index.ts — modified login route
import { sign } from "hono/jwt";
import { createSession } from "~/lib/session-store";

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const result = await findboligService.login(email, password);
  if (!result?.cookies) {
    return c.json({ error: "Login failed" }, 401);
  }

  const sessionId = crypto.randomUUID();
  const cookieString = parseCookies(result.cookies);

  await createSession(sessionId, {
    cookies: cookieString,
    email,
    password,
  });

  const token = await sign(
    { sub: sessionId, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 },
    process.env.JWT_SECRET!,
  );

  // Return JWT + user info (no cookies exposed to client)
  return c.json({ token, fullName: result.fullName, email: result.email });
});
```

#### Server: Auto re-auth middleware

```typescript
// server/src/lib/auth-middleware.ts
import { getSession, updateCookies } from "./session-store";
import { decrypt } from "./crypto";
import * as findboligService from "~/findbolig-service";

export async function getValidCookies(sessionId: string): Promise<string | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  // Try existing cookies first
  const testRes = await fetch("https://findbolig.nu/api/users/me", {
    headers: { Cookie: session.findboligCookies },
  });

  if (testRes.ok) {
    return session.findboligCookies;
  }

  // Cookies expired — re-authenticate
  const email = decrypt(session.encryptedEmail);
  const password = decrypt(session.encryptedPassword);
  const freshLogin = await findboligService.login(email, password);

  if (!freshLogin?.cookies) return null;

  const newCookies = parseCookies(freshLogin.cookies);
  await updateCookies(sessionId, newCookies);
  return newCookies;
}
```

#### Client: Simplified auth store

```typescript
// client/src/composables/useAuth.ts — simplified
const token = ref("");   // JWT only, no findbolig cookies
const name = ref("");

async function login(userEmail: string, userPassword: string) {
  const res = await fetch(`${config.backendDomain}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: userPassword }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  token.value = data.token;
  name.value = data.fullName;
  isAuthenticated.value = true;
  return true;
}

// All API calls use the JWT, no cookies involved
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token.value}`,
    },
  });
}
```

### Pros

- **Password never stored on client** — client only holds a JWT. No plaintext credentials in localStorage.
- **Transparent re-auth** — session never expires from the user's perspective. Server handles it silently.
- **Cloud Run compatible** — Firestore is serverless and scales with Cloud Run. No infrastructure changes needed.
- **Good transparency story** — "Your credentials are encrypted on our server using AES-256 and only used to maintain your findbolig.nu session. They are deleted when you log out."
- **Session survives tab close** — JWT is long-lived (e.g., 7 days). findbolig session is refreshed server-side when needed.

### Cons

- **Medium complexity** — need Firestore setup, encryption, JWT signing, new middleware.
- **Credentials still stored somewhere** — even encrypted, storing user passwords is a responsibility. A compromised encryption key = all credentials exposed.
- **Added latency** — Firestore lookup on every request (~10-50ms). Mitigated with Cloud Run in same region.
- **Cost** — Firestore has a free tier (1 GiB storage, 50k reads/day) which is likely sufficient. Redis Memorystore starts at ~$30/month.
- **Encryption key management** — need to manage `JWT_SECRET` and `ENCRYPTION_KEY` via Secret Manager or env vars.

### Best for

**Recommended if staying on Cloud Run.** Good balance of security, UX, and complexity. Firestore's free tier keeps costs near zero.

---

## Option 3: VPS with In-Memory Session Manager

**Philosophy**: Move to a long-lived server process where sessions live in memory. Server proactively keeps sessions alive with background timers.

### Architecture

```
┌─────────┐    session token     ┌───────────────────┐    Cookie header    ┌───────────────┐
│  Client  │ ──────────────────► │  Hono on VPS      │ ──────────────────► │ findbolig.nu  │
│ (Vue 3)  │ ◄────────────────── │  (Fly.io/Railway)  │ ◄────────────────── │  (Sitecore)   │
└─────────┘                      │                   │                     └───────────────┘
                                 │ In-memory Map:    │
                                 │ sessionId → {     │
                                 │   cookies,        │
                                 │   credentials,    │
                                 │   keepAliveTimer  │
                                 │ }                 │
                                 └───────────────────┘
```

### How it works

1. **Login**: Same as Option 2, but session is stored in an in-memory `Map` instead of Firestore.
2. **Background keep-alive**: On login, server starts a `setInterval` per user that pings `findbolig.nu/api/users/me` every 10 minutes. This keeps the Sitecore session alive even when the user's tab is closed.
3. **Auto re-auth**: If the keep-alive gets a 401, server re-authenticates with stored credentials automatically.
4. **Session cleanup**: Sessions expire after configurable inactivity (e.g., 24 hours without any client request). Timer is cleared on cleanup.

### Code examples

#### Server: In-memory session manager

```typescript
// server/src/lib/session-manager.ts
import * as findboligService from "~/findbolig-service";

interface Session {
  findboligCookies: string;
  email: string;
  password: string;
  lastClientActivity: number;
  keepAliveTimer: ReturnType<typeof setInterval>;
}

const sessions = new Map<string, Session>();

const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000;  // 10 minutes
const SESSION_TTL = 24 * 60 * 60 * 1000;     // 24 hours

export function createSession(sessionId: string, data: {
  cookies: string;
  email: string;
  password: string;
}): void {
  // Start background keep-alive for this session
  const timer = setInterval(() => keepAlive(sessionId), KEEP_ALIVE_INTERVAL);

  sessions.set(sessionId, {
    findboligCookies: data.cookies,
    email: data.email,
    password: data.password,
    lastClientActivity: Date.now(),
    keepAliveTimer: timer,
  });
}

async function keepAlive(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Clean up stale sessions
  if (Date.now() - session.lastClientActivity > SESSION_TTL) {
    destroySession(sessionId);
    return;
  }

  // Ping findbolig to keep session alive
  const res = await fetch("https://findbolig.nu/api/users/me", {
    headers: { Cookie: session.findboligCookies },
  });

  if (res.ok) {
    // Update cookies if new Set-Cookie headers
    const newCookies = res.headers.getSetCookie();
    if (newCookies.length > 0) {
      session.findboligCookies = parseCookies(newCookies);
    }
    return;
  }

  // Session expired — re-authenticate
  const freshLogin = await findboligService.login(session.email, session.password);
  if (freshLogin?.cookies) {
    session.findboligCookies = parseCookies(freshLogin.cookies);
  } else {
    destroySession(sessionId);
  }
}

export function getSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId);
  if (session) session.lastClientActivity = Date.now();
  return session;
}

export function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    clearInterval(session.keepAliveTimer);
    sessions.delete(sessionId);
  }
}

// Cleanup on shutdown
process.on("SIGTERM", () => {
  for (const [id] of sessions) destroySession(id);
});
```

#### Example VPS hosting (Fly.io)

```toml
# fly.toml
[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  auto_stop_machines = false   # Keep the machine running (no scale-to-zero)
  min_machines_running = 1

[env]
  NODE_ENV = "production"
```

### Pros

- **Simplest server-side solution** — no external database, no encryption libraries, just a `Map`.
- **Proactive keep-alive** — server pings findbolig in the background. Sessions rarely expire.
- **Low latency** — everything in-memory, no Firestore round-trips.
- **Cheap** — Fly.io shared-cpu-1x is ~$3/month. Railway/Render have free tiers for small apps.
- **Good enough for a small user base** — if you have <100 concurrent users, this handles it easily.

### Cons

- **Sessions lost on restart/deploy** — all users get logged out when you push a new version. Can be mitigated with graceful shutdown + fast re-auth, but annoying.
- **Single point of failure** — one server instance. If it crashes, all sessions are gone.
- **Doesn't scale horizontally** — multiple instances can't share in-memory sessions. Sticky sessions or a shared store would be needed.
- **Credentials in plaintext in memory** — if the process is compromised, all credentials are exposed. (Encryption doesn't fully help since the key is also in memory.)
- **No auto-scaling** — you're paying for the VPS even when no one is using it (though the cost is trivial).

### Best for

Small-scale app with a handful of users where simplicity is more valuable than resilience. **Good for a side project that doesn't need 99.9% uptime.**

---

## Option 4: Full Own-Auth Layer (JWT + Decoupled findbolig Session)

**Philosophy**: fetchBolig.js becomes its own platform with proper user accounts. findbolig.nu is treated as an external integration that users link to their account.

### Architecture

```
┌─────────┐   own JWT / session   ┌──────────────────────┐   Cookie hdr   ┌───────────────┐
│  Client  │ ───────────────────► │  Hono Backend        │ ─────────────► │ findbolig.nu  │
│ (Vue 3)  │ ◄─────────────────── │                      │ ◄───────────── │               │
└─────────┘                       │  • Own user DB       │                └───────────────┘
                                  │  • bcrypt passwords  │
                                  │  • Session manager   │
                                  │  • findbolig linker  │
                                  └──────────┬───────────┘
                                             │
                                      ┌──────▼──────┐
                                      │  Database   │
                                      │ (SQLite /   │
                                      │  Postgres)  │
                                      │             │
                                      │ users table │
                                      │ linked_accs │
                                      └─────────────┘
```

### How it works

1. **Sign up**: User creates a fetchBolig.js account (email + password). Password is hashed with bcrypt and stored in the database.
2. **Link findbolig account**: After signing in, user enters their findbolig.nu credentials in a "Link Account" flow. Server validates them against findbolig.nu, then stores them encrypted in the database.
3. **Normal usage**: Client authenticates with fetchBolig.js JWT only. Server manages findbolig session entirely — client has zero awareness of findbolig auth.
4. **Session management**: Server maintains findbolig sessions (keep-alive + auto re-auth) as in Option 2 or 3.

### Code examples

#### Database schema (SQLite with Drizzle ORM)

```typescript
// server/src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),            // UUID
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const linkedAccounts = sqliteTable("linked_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(),   // "findbolig"
  encryptedEmail: text("encrypted_email").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  lastSessionRefresh: integer("last_session_refresh", { mode: "timestamp" }),
});
```

#### Server: Auth routes

```typescript
// server/src/routes/auth.ts
import { Hono } from "hono";
import bcrypt from "bcrypt";
import { sign, verify } from "hono/jwt";
import { db } from "~/db";
import { users } from "~/db/schema";

const auth = new Hono();

auth.post("/register", async (c) => {
  const { email, password, name } = await c.req.json();
  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();

  await db.insert(users).values({ id, email, passwordHash, name, createdAt: new Date() });

  const token = await sign({ sub: id }, process.env.JWT_SECRET!);
  return c.json({ token, name, email });
});

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await sign({ sub: user.id }, process.env.JWT_SECRET!);
  return c.json({ token, name: user.name, email: user.email });
});
```

#### Server: Link findbolig account

```typescript
// server/src/routes/integrations.ts
auth.post("/link-findbolig", async (c) => {
  const userId = c.get("userId"); // from JWT middleware
  const { email, password } = await c.req.json();

  // Validate credentials against findbolig.nu
  const result = await findboligService.login(email, password);
  if (!result) {
    return c.json({ error: "findbolig.nu login failed — check your credentials" }, 400);
  }

  // Store encrypted credentials
  await db.insert(linkedAccounts).values({
    id: crypto.randomUUID(),
    userId,
    provider: "findbolig",
    encryptedEmail: encrypt(email),
    encryptedPassword: encrypt(password),
  });

  return c.json({ ok: true, message: "findbolig.nu account linked" });
});
```

### Pros

- **Best security** — user's fetchBolig.js password is bcrypt-hashed. findbolig credentials are encrypted and isolated. Client never handles any sensitive tokens.
- **Best transparency** — clear separation: "Your fetchBolig.js password is hashed. Your findbolig.nu credentials are encrypted and only used to sync your data. You can unlink at any time."
- **Session is permanent** — user stays logged into fetchBolig.js for days/weeks (long-lived JWT). findbolig session is fully server-managed.
- **Future-proof** — enables features like: multiple housing platform integrations, user preferences, notification settings, sharing between users.
- **Can run anywhere** — Cloud Run + Cloud SQL, or VPS + SQLite.

### Cons

- **Highest complexity** — user database, registration flow, password hashing, encryption, DB migrations, account linking UI.
- **Two sets of credentials** — users create a new account AND enter their findbolig credentials. Adds friction.
- **Ongoing DB maintenance** — migrations, backups, security updates.
- **Overkill for current scale** — if there are only a few users, this is significant overhead.
- **Legal considerations** — storing user data may require GDPR compliance (privacy policy, data deletion, etc.).

### Best for

**When fetchBolig.js becomes a real product** with multiple users, potential for multiple integrations, and a need for a professional auth story. Not recommended for the current stage unless you're planning to grow significantly.

---

## Comparison

| Criteria | Option 1: Client-Side | Option 2: Server + Firestore | Option 3: VPS In-Memory | Option 4: Own Auth |
|---|---|---|---|---|
| **Complexity** | Low | Medium | Medium | High |
| **Implementation time** | Hours | 1-2 days | 1-2 days | 3-5 days |
| **Security** | ⚠️ Plaintext in localStorage | ✅ Encrypted server-side | ✅ Server memory only | ✅✅ Hashed + encrypted |
| **Transparency** | ⚠️ Hard to justify | ✅ Clear story | ✅ Clear story | ✅✅ Industry standard |
| **UX** | OK (occasional re-logins) | Good (seamless) | Good (proactive) | Best (persistent) |
| **Cloud Run compatible** | ✅ | ✅ (with Firestore) | ❌ (needs VPS) | ✅ (with Cloud SQL) |
| **Survives tab close** | ❌ (unless re-login) | ✅ | ✅ | ✅ |
| **Survives server restart** | N/A | ✅ | ❌ | ✅ |
| **Scales horizontally** | N/A | ✅ | ❌ | ✅ |
| **Monthly cost** | $0 | ~$0 (Firestore free tier) | ~$3-5 (small VPS) | ~$0-10 (depending on DB) |
| **Credential location** | Client localStorage | Server (Firestore, encrypted) | Server (memory, plaintext) | Server (DB, encrypted) |
| **GDPR considerations** | Minimal | Moderate | Moderate | Significant |

## Recommendation

**For now: Option 1 as immediate improvement + Option 2 as the next step.**

1. **This week**: Ship Option 1 changes — they're low-risk and improve UX immediately. The `ensureSession()` and `validateSession()` functions are already written; just wire them in with the Visibility API and pre-request guards.

2. **Next iteration**: Implement Option 2 with Firestore. It's the best fit for Cloud Run, removes plaintext credentials from the client, and gives a clear security story. Firestore's free tier means near-zero cost increase.

3. **Longer term**: If fetchBolig.js grows into a multi-user product, evolve toward Option 4. The session store from Option 2 becomes the `linkedAccounts` table, so it's a natural progression rather than a rewrite.

Option 3 (VPS) is a good alternative to Option 2 if you value simplicity over resilience. The main trade-off is losing sessions on deploys and having no horizontal scaling — totally fine for a small user base, but Cloud Run + Firestore is arguably simpler to operate long-term.

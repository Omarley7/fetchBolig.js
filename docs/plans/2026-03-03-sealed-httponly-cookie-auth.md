# Sealed HttpOnly Cookie Auth — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace client-side credential storage (localStorage) with a server-sealed HttpOnly cookie using iron-webcrypto, so that passwords and findbolig session cookies never touch client JS.

**Architecture:** Server seals findbolig cookies + encrypted credentials into a single HttpOnly cookie. Client sends `credentials: 'include'` on every fetch — browser handles cookie transport automatically. Server auto-reauths with findbolig when its session expires, transparent to the client.

**Tech Stack:** iron-webcrypto (seal/unseal), Hono cookie helper (`hono/cookie`), existing Hono + Vue 3 stack.

---

### Task 1: Server foundation — install dep, create session helpers, update .env

**Files:**
- Modify: `server/package.json`
- Create: `server/src/lib/session.ts`
- Modify: `server/.env`

**Step 1: Install iron-webcrypto**

Run: `cd server && npm install iron-webcrypto`

**Step 2: Add COOKIE_SECRET to server/.env**

Append to `server/.env`:

```
COOKIE_SECRET=CHANGE_ME_TO_A_RANDOM_32_CHAR_STRING
```

**Step 3: Create `server/src/lib/session.ts`**

```typescript
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
```

**Step 4: Commit**

```bash
git add server/package.json server/package-lock.json server/src/lib/session.ts
git commit -m "feat: add iron-webcrypto and session seal/unseal helpers"
```

---

### Task 2: Server auth layer — rewrite auth-helpers, update all routes

**Files:**
- Rewrite: `server/src/lib/auth-helpers.ts`
- Modify: `server/src/index.ts`

**Step 1: Rewrite `server/src/lib/auth-helpers.ts`**

```typescript
import type { Context } from "hono";
import {
  getSessionFromCookie,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  type SealedSession,
} from "./session";
import { login } from "~/findbolig-service";

export class AuthError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Wraps a findbolig-service call with automatic session handling:
 * 1. Unseals the session cookie
 * 2. Calls fn with findbolig cookies
 * 3. On upstream 401: re-authenticates with stored credentials and retries
 * 4. Re-seals the (possibly updated) session cookie
 */
export async function withReauth<T>(
  c: Context,
  fn: (cookies: string) => Promise<T>,
): Promise<T> {
  const session = await getSessionFromCookie(c);
  if (!session) throw new AuthError();

  try {
    const result = await fn(session.fbCookies);
    await setSessionCookie(c, session);
    return result;
  } catch (error) {
    if (isUpstream401(error)) {
      const refreshed = await reauth(session);
      if (!refreshed) {
        await clearSessionCookie(c);
        throw new AuthError("Session expired, please log in again");
      }
      await setSessionCookie(c, refreshed);
      return await fn(refreshed.fbCookies);
    }
    throw error;
  }
}

async function reauth(session: SealedSession): Promise<SealedSession | null> {
  const result = await login(session.fbEmail, session.fbPassword);
  if (!result?.cookies?.length) return null;
  return { ...session, fbCookies: parseCookies(result.cookies) };
}

function isUpstream401(error: unknown): boolean {
  return error instanceof Error && /:\s*401/.test(error.message);
}
```

**Step 2: Update `server/src/index.ts`**

Replace the full file with:

```typescript
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import "dotenv/config";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import * as findboligService from "~/findbolig-service";
import { TimeoutError } from "~/findbolig-service";
import { AuthError, withReauth } from "~/lib/auth-helpers";
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionFromCookie,
  parseCookies,
  type SealedSession,
} from "~/lib/session";

function handleError(c: Context, error: unknown) {
  if (error instanceof AuthError) {
    return c.json({ error: error.message }, 401);
  }
  console.error(error);
  if (error instanceof TimeoutError) {
    return c.json({ error: "timeout", message: "findbolig.nu is not responding" }, 504);
  }
  return c.json({ error: "Internal server error" }, 500);
}

const app = new Hono();

app.get("/*", serveStatic({ root: "../client/dist" }));

app.notFound((c) => c.json({ error: "Not found", ok: false }, 404));

const api = new Hono();

const auth = new Hono().basePath("/auth");
const offers = new Hono().basePath("/offers");
const threads = new Hono().basePath("/threads");
const users = new Hono().basePath("/users");
const residences = new Hono().basePath("/residence");
const appointments = new Hono().basePath("/appointments");

api.use(
  "/*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
  logger(),
  prettyJSON(),
);

// ── Auth routes ──────────────────────────────────────────────

auth.post("/login", async (c) => {
  try {
    const { email, password, remember } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const result = await findboligService.login(email, password);
    if (!result?.cookies?.length) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const session: SealedSession = {
      fbCookies: parseCookies(result.cookies),
      fbEmail: email,
      fbPassword: password,
      fullName: result.fullName,
      email: result.email,
    };

    await setSessionCookie(c, session, remember !== false);
    return c.json({ fullName: result.fullName, email: result.email });
  } catch (error) {
    return handleError(c, error);
  }
});

auth.post("/logout", async (c) => {
  await clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.get("/refresh", async (c) => {
  try {
    const session = await getSessionFromCookie(c);
    if (!session) return c.json({ error: "Not authenticated" }, 401);

    const result = await findboligService.refreshSession(session.fbCookies);
    if (result) {
      // Update cookies if findbolig sent new ones
      if (result.cookies?.length) {
        session.fbCookies = parseCookies(result.cookies);
      }
      session.fullName = result.fullName;
      session.email = result.email;
      await setSessionCookie(c, session);
      return c.json({ fullName: result.fullName, email: result.email });
    }

    // findbolig session expired — try re-auth with stored credentials
    const fresh = await findboligService.login(session.fbEmail, session.fbPassword);
    if (!fresh?.cookies?.length) {
      await clearSessionCookie(c);
      return c.json({ error: "Session expired" }, 401);
    }

    session.fbCookies = parseCookies(fresh.cookies);
    session.fullName = fresh.fullName;
    session.email = fresh.email;
    await setSessionCookie(c, session);
    return c.json({ fullName: fresh.fullName, email: fresh.email });
  } catch (error) {
    return handleError(c, error);
  }
});

// ── Data routes (all use withReauth) ─────────────────────────

appointments.get("/upcoming", async (c) => {
  try {
    const includeAll = c.req.query("includeAll") === "true";
    const result = await withReauth(c, (cookies) =>
      findboligService.getUpcomingAppointments(cookies, includeAll),
    );
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});

offers.get("/", async (c) => {
  try {
    const result = await withReauth(c, (cookies) =>
      findboligService.fetchOffers(cookies),
    );
    return c.json(result.results);
  } catch (error) {
    return handleError(c, error);
  }
});

offers.get("/:offerId/position", async (c) => {
  try {
    const offerId = c.req.param("offerId");
    if (!offerId) return c.json({ error: "Offer ID is required" }, 400);
    const result = await withReauth(c, (cookies) =>
      findboligService.getPositionOnOffer(offerId, cookies),
    );
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});

threads.get("/", async (c) => {
  try {
    const result = await withReauth(c, (cookies) =>
      findboligService.fetchThreads(cookies),
    );
    return c.json(result.results);
  } catch (error) {
    return handleError(c, error);
  }
});

users.get("/me", async (c) => {
  try {
    const result = await withReauth(c, (cookies) =>
      findboligService.getUserData(cookies),
    );
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});

residences.get("/:residenceId", async (c) => {
  try {
    const residenceId = c.req.param("residenceId");
    const result = await withReauth(c, (cookies) =>
      findboligService.getResidence(residenceId, cookies),
    );
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});

api.route("/", auth);
api.route("/", offers);
api.route("/", threads);
api.route("/", users);
api.route("/", residences);
api.route("/", appointments);

app.route("/api", api);

// SPA fallback
app.get("*", serveStatic({ root: "../client/dist", rewriteRequestPath: () => "/index.html" }));

const server = serve({ ...app, hostname: "0.0.0.0" }, (info) => {
  console.log(`Server is running on ${info.address}:${info.port}`);
});

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
```

**Step 3: Commit**

```bash
git add server/src/lib/auth-helpers.ts server/src/index.ts
git commit -m "feat: implement sealed cookie auth routes with auto-reauth"
```

---

### Task 3: Server cleanup — remove TLS disable, update shared types

**Files:**
- Modify: `server/src/findbolig-service.ts` (line 14)
- Modify: `shared/types.ts`
- Modify: `server/src/lib/findbolig-domain.ts` (line 74-79)

**Step 1: Remove TLS disable from `server/src/findbolig-service.ts`**

Delete this line (line 14):
```typescript
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
```

**Step 2: Update `shared/types.ts`**

Remove `cookies` from `UserData`:

```typescript
export type UserData = {
  email: string;
  fullName: string;
};
```

**Step 3: Update `server/src/lib/findbolig-domain.ts`**

Change `apiUserDataToDomain` to return cookies separately (lines 74-79):

```typescript
export function apiUserDataToDomain(apiUserData: ApiUserData, cookies?: string[]): UserData & { cookies: string[] } {
  return {
    email: apiUserData.email,
    fullName: apiUserData.notifications.fullName,
    cookies: cookies || [],
  };
}
```

Note: The return type extends `UserData` with `cookies` so the server can use it internally, but the shared `UserData` type (used by the client) no longer has cookies.

**Step 4: Commit**

```bash
git add server/src/findbolig-service.ts shared/types.ts server/src/lib/findbolig-domain.ts
git commit -m "fix: remove TLS disable, remove cookies from shared UserData type"
```

---

### Task 4: Client data layer — remove cookie headers, add credentials

**Files:**
- Modify: `client/src/data/appointmentsSource.ts`
- Modify: `client/src/data/appointments.ts`

**Step 1: Update `client/src/data/appointmentsSource.ts`**

Remove `cookies` parameter from `fetchAppointments` and the `x-findbolig-cookies` header. Add `credentials: 'include'` to all fetches.

```typescript
import type { Appointment, UserData } from "@/types";
import { MOCK_DEAS_APPOINTMENTS } from "./mockData";
import config from "~/config";

const TIMEOUT_LOGIN = 25_000;
const TIMEOUT_APPOINTMENTS = 90_000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof HttpError && error.status === 504) return true;
  return false;
}

export function handleApiError(
  error: unknown,
  toast: { warning: (msg: string, dur?: number) => void; error: (msg: string, dur?: number) => void },
  t: (key: string) => string,
  fallback: string = "An unexpected error occurred",
  timeoutKey: string = "errors.timeout",
) {
  if (isTimeoutError(error)) {
    toast.warning(t(timeoutKey), 8000);
  } else {
    toast.error(error instanceof Error ? error.message : fallback);
  }
}

export async function fetchAppointments(
  includeAll: boolean = false
): Promise<{
  updatedAt: Date;
  appointments: Appointment[];
}> {
  if (config.useMockData) {
    console.log("Using mock server data");
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { updatedAt: new Date(), appointments: MOCK_DEAS_APPOINTMENTS };
  }

  try {
    const queryParam = includeAll ? "?includeAll=true" : "";
    const result = await fetchWithTimeout(
      `${config.backendDomain}/api/appointments/upcoming${queryParam}`,
      {
        method: "GET",
        credentials: "include",
      },
      TIMEOUT_APPOINTMENTS,
    );
    if (!result.ok) {
      throw new HttpError(`Failed to fetch appointments: ${result.status}`, result.status);
    }
    const data = await result.json();
    return { updatedAt: new Date(), appointments: data as Appointment[] };
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    throw error;
  }
}

export async function login(
  email: string,
  password: string,
  remember: boolean = true,
): Promise<UserData | null> {
  try {
    const result = await fetchWithTimeout(
      `${config.backendDomain}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, remember }),
      },
      TIMEOUT_LOGIN,
    );
    if (!result.ok) {
      throw new HttpError(`Failed to login: ${result.status}`, result.status);
    }
    return await result.json();
  } catch (error) {
    console.error("Failed to login:", error);
    throw error;
  }
}
```

**Step 2: Update `client/src/data/appointments.ts`**

Remove `cookies` parameter from `getAppointments`:

```typescript
import { deserializeAppointmentsPayload } from "~/lib/serialization";
import { useToastStore } from "~/stores/toast";
import { fetchAppointments } from "./appointmentsSource";

const STORAGE_KEY = "appointments_cache";

export function getCacheAge(): number | null {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (!parsed.updatedAt) return null;
    return Date.now() - new Date(parsed.updatedAt).getTime();
  } catch {
    return null;
  }
}

export function isCacheStale(thresholdMs = 24 * 60 * 60 * 1000): boolean {
  const age = getCacheAge();
  if (age === null) return false;
  return age > thresholdMs;
}

export async function getAppointments(
  forceRefresh: boolean = false,
  includeAll: boolean = false,
) {
  if (!forceRefresh) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return deserializeAppointmentsPayload(parsed);
      } catch (error) {
        const toast = useToastStore();
        toast.warning("Failed to load cached data, fetching fresh data...");
      }
    }
  }

  const payload = await fetchAppointments(includeAll);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}
```

**Step 3: Commit**

```bash
git add client/src/data/appointmentsSource.ts client/src/data/appointments.ts
git commit -m "feat: switch client data layer to cookie-based auth"
```

---

### Task 5: Client auth — rewrite useAuth, update appointments store, update LoginForm

**Files:**
- Rewrite: `client/src/composables/useAuth.ts`
- Modify: `client/src/stores/appointments.ts`
- Modify: `client/src/components/LoginForm.vue`

**Step 1: Rewrite `client/src/composables/useAuth.ts`**

```typescript
import { defineStore } from "pinia";
import { ref } from "vue";
import { login as apiLogin, handleApiError, HttpError } from "~/data/appointmentsSource";
import { useToastStore } from "~/stores/toast";
import { useI18n } from "~/i18n";
import config from "~/config";

const TIMEOUT_REFRESH = 15_000;

export const useAuth = defineStore(
  "auth",
  () => {
    const email = ref("");
    const isLoading = ref(false);
    const isAuthenticated = ref(false);
    const name = ref("");
    const showLoginModal = ref(false);
    let keepAliveTimer: number | null = null;
    const toast = useToastStore();

    async function login(userEmail: string, userPassword: string, remember: boolean = true) {
      isLoading.value = true;

      try {
        const userData = await apiLogin(userEmail, userPassword, remember);
        if (!userData) {
          toast.error("Login failed. Please try again.");
          return setAuthenticated(false);
        }

        email.value = userEmail;
        const ok = setAuthenticated(true, userData.fullName);
        if (ok) {
          startKeepAlive();
          toast.success(useI18n().t("auth.loginSuccess"));
        }
        return ok;
      } catch (err) {
        if (err instanceof HttpError && err.status === 401) {
          toast.error(useI18n().t("errors.invalidCredentials"), 6000);
        } else {
          handleApiError(err, toast, useI18n().t, "Login failed unexpectedly...", "errors.timeoutLogin");
        }
        return setAuthenticated(false);
      } finally {
        isLoading.value = false;
      }
    }

    function setAuthenticated(value: boolean, newName?: string) {
      isAuthenticated.value = value;
      if (newName !== undefined) name.value = newName;
      if (!value) stopKeepAlive();
      return value;
    }

    function startKeepAlive() {
      stopKeepAlive();
      keepAliveTimer = window.setInterval(async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_REFRESH);
          const res = await fetch(`${config.backendDomain}/api/auth/refresh`, {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) {
            if (res.status === 401) setAuthenticated(false);
            return;
          }

          const data = await res.json();
          if (data?.fullName) name.value = data.fullName;
        } catch (e) {
          console.error("Keep-alive failed:", e);
        }
      }, 3 * 60 * 1000);
    }

    function stopKeepAlive() {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    }

    async function logout() {
      try {
        await fetch(`${config.backendDomain}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Best-effort — clear client state regardless
      }
      setAuthenticated(false);
      name.value = "";
    }

    async function validateSession(): Promise<boolean> {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_REFRESH);
        const res = await fetch(`${config.backendDomain}/api/auth/refresh`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          if (res.status === 401) setAuthenticated(false);
          return false;
        }

        const data = await res.json();
        if (data?.fullName) name.value = data.fullName;
        isAuthenticated.value = true;
        return true;
      } catch {
        return false;
      }
    }

    async function ensureSession(): Promise<boolean> {
      // Server handles auto-reauth — just validate the cookie
      const valid = await validateSession();
      if (!valid) setAuthenticated(false);
      return valid;
    }

    // Resume keep-alive if already authenticated on startup
    if (isAuthenticated.value) startKeepAlive();

    // Validate session when tab regains focus
    let lastVisibilityCheck = 0;
    const VISIBILITY_COOLDOWN = 30_000;

    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState !== "visible") return;
      if (!isAuthenticated.value) return;

      const now = Date.now();
      if (now - lastVisibilityCheck < VISIBILITY_COOLDOWN) return;
      lastVisibilityCheck = now;

      await ensureSession();
    });

    return { email, isLoading, isAuthenticated, name, showLoginModal, login, logout, startKeepAlive, stopKeepAlive, validateSession, ensureSession };
  },
  {
    persist: {
      paths: ["email", "isAuthenticated", "name"],
    },
  },
);
```

Key changes from original:
- Removed: `password`, `cookies`, `rememberPassword` refs entirely
- Removed: `password` and `cookies` from persist paths
- Login takes `remember` boolean (controls cookie Max-Age on server)
- Keep-alive uses `credentials: "include"` instead of custom header
- Logout calls `POST /api/auth/logout` to clear server cookie
- `ensureSession` simplified — server handles re-auth transparently

**Step 2: Update `client/src/stores/appointments.ts`**

Remove all `auth.cookies` references. Remove `cookies` parameter from `getAppointments` calls.

```typescript
import type { Appointment } from "@/types";
import { defineStore, storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { getAppointments, isCacheStale } from "~/data/appointments";
import { handleApiError } from "~/data/appointmentsSource";
import { useAuth } from "~/composables/useAuth";
import { useToastStore } from "~/stores/toast";
import { useI18n } from "~/i18n";
import config from "~/config";

export const useAppointmentsStore = defineStore("appointments", () => {
  const appointments = ref<Appointment[]>([]);
  const updatedAt = ref<Date | null>(null);
  const isLoading = ref(false);
  const showAllOffers = ref(false);
  const needsRefresh = ref(false);
  const sessionExpired = ref(false);

  async function init() {
    const auth = useAuth();

    isLoading.value = true;
    try {
      // Always load from cache first — does NOT require auth
      const cached = await getAppointments(false, showAllOffers.value);
      appointments.value = cached.appointments;
      updatedAt.value = cached.updatedAt;

      if (!auth.isAuthenticated) {
        sessionExpired.value = true;
        return;
      }

      if (isCacheStale()) {
        const sessionValid = await auth.ensureSession();
        if (sessionValid) {
          needsRefresh.value = true;
        } else {
          sessionExpired.value = true;
        }
      }
    } catch {
      if (!auth.isAuthenticated) return;
      try {
        const payload = await getAppointments(true, showAllOffers.value);
        appointments.value = payload.appointments;
        updatedAt.value = payload.updatedAt;
      } catch (error) {
        handleApiError(error, useToastStore(), useI18n().t, "Failed to load appointments");
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function refresh() {
    isLoading.value = true;
    needsRefresh.value = false;
    const auth = useAuth();
    try {
      const payload = await getAppointments(true, showAllOffers.value);
      appointments.value = payload.appointments;
      updatedAt.value = payload.updatedAt;
    } catch (error) {
      const is401 = error instanceof Error && error.message.includes("401");
      if (is401) {
        const recovered = await auth.ensureSession();
        if (recovered) {
          try {
            const payload = await getAppointments(true, showAllOffers.value);
            appointments.value = payload.appointments;
            updatedAt.value = payload.updatedAt;
            return;
          } catch {
            // retry also failed
          }
        } else {
          sessionExpired.value = true;
          return;
        }
      }
      handleApiError(error, useToastStore(), useI18n().t, "Failed to refresh appointments");
    } finally {
      isLoading.value = false;
    }
  }

  function dismissRefresh() {
    needsRefresh.value = false;
  }

  let pendingRefresh = false;

  async function handleRefresh() {
    const auth = useAuth();
    if (!auth.isAuthenticated) {
      pendingRefresh = true;
      auth.showLoginModal = true;
      return;
    }
    const sessionValid = await auth.ensureSession();
    if (!sessionValid) {
      sessionExpired.value = true;
      needsRefresh.value = false;
      return;
    }
    await refresh();
  }

  const { isAuthenticated } = storeToRefs(useAuth());
  watch(isAuthenticated, (loggedIn) => {
    if (loggedIn) {
      sessionExpired.value = false;
      if (pendingRefresh) {
        pendingRefresh = false;
        refresh();
      }
    }
  });

  function toggleShowAllOffers() {
    showAllOffers.value = !showAllOffers.value;
  }

  function getImageUrl(imagePath: string): string {
    return `${config.imageBaseUrl}${imagePath}`;
  }

  return {
    appointments,
    updatedAt,
    isLoading,
    showAllOffers,
    needsRefresh,
    sessionExpired,
    init,
    refresh,
    dismissRefresh,
    handleRefresh,
    toggleShowAllOffers,
    getImageUrl,
  };
});
```

**Step 3: Update `client/src/components/LoginForm.vue`**

Use local ref for password. Remove "Remember Password" checkbox (cookie handles persistence). Keep email in auth store for pre-filling.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useI18n } from "vue-i18n";

const auth = useAuth();
const { t } = useI18n();
const password = ref("");
const isLogoutModalOpen = ref(false);

async function handleLogin() {
  if (await auth.login(auth.email, password.value)) {
    password.value = "";
    auth.showLoginModal = false;
  }
}

function openModal() {
  auth.showLoginModal = true;
}

function closeModal() {
  auth.showLoginModal = false;
}

function openLogoutModal() {
  isLogoutModalOpen.value = true;
}

function closeLogoutModal() {
  isLogoutModalOpen.value = false;
}

function confirmLogout() {
  isLogoutModalOpen.value = false;
  auth.logout();
}
</script>

<template>
  <div>
    <!-- Login/Logout Button -->
    <div class="disabled:opacity-50 cursor-pointer p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
      <div v-if="!auth.isAuthenticated" @click="openModal" :aria-label="t('common.login')">
        <img src="/icons/user-round-key.svg" :alt="t('common.login')"
          class="size-6 dark:invert" />
      </div>
      <div v-else @click="openLogoutModal" :disabled="auth.isLoading" :aria-label="t('common.logout')">
        <img src="/icons/log-out.svg" :alt="t('common.logout')"
          class="size-6 dark:invert" />
      </div>
    </div>

    <!-- Login Modal -->
    <Teleport to="body">
      <div v-if="auth.showLoginModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeModal">
        <div
          class="bg-violet-50 dark:bg-violet-950 text-gray-900 dark:text-gray-100 border border-violet-200 dark:border-violet-800/50 rounded-lg shadow-xl p-6 max-w-md w-full mx-20">
          <div class="flex justify-between items-center mb-1">
            <h2 class="text-xl font-semibold">{{ t('common.login') }}</h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close modal">
              <img src="/icons/x.svg" alt="Close" class="size-6 dark:invert" />
            </button>
          </div>
          <p class="text-sm text-violet-600 dark:text-violet-400 mb-4">{{ t('auth.findboligCredentials') }}</p>

          <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <input id="email" v-model="auth.email" type="email" :placeholder="t('landing.emailPlaceholder')" :disabled="auth.isLoading"
                class="disabled:opacity-50 px-3 py-2 border border-violet-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-transparent" />
            </div>

            <div class="flex flex-col gap-2">
              <input id="password" v-model="password" type="password" :placeholder="t('landing.passwordPlaceholder')"
                :disabled="auth.isLoading"
                class="disabled:opacity-50 px-3 py-2 border border-violet-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-transparent" />
            </div>

            <button type="submit" :disabled="auth.isLoading"
              class="disabled:opacity-50 bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700 transition-colors font-medium">
              {{ auth.isLoading ? t('auth.loggingIn') : t('common.login') }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Logout Confirmation Modal -->
    <Teleport to="body">
      <div v-if="isLogoutModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeLogoutModal">
        <div
          class="bg-violet-50 dark:bg-violet-950 text-gray-900 dark:text-gray-100 border border-violet-200 dark:border-violet-800/50 rounded-lg shadow-xl p-6 max-w-sm w-full mx-20">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">{{ t('common.logout') }}</h2>
            <button @click="closeLogoutModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close modal">
              <img src="/icons/x.svg" alt="Close" class="size-6 dark:invert" />
            </button>
          </div>

          <p class="mb-6 text-gray-600 dark:text-gray-300">{{ t('auth.logoutConfirm') }}</p>

          <div class="flex gap-3 justify-end">
            <button @click="closeLogoutModal"
              class="px-4 py-2 rounded-md border border-violet-200 dark:border-violet-700 text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors">
              {{ t('auth.cancel') }}
            </button>
            <button @click="confirmLogout" :disabled="auth.isLoading"
              class="disabled:opacity-50 px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors font-medium">
              {{ auth.isLoading ? t('auth.loggingOut') : t('common.logout') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
```

**Step 4: Commit**

```bash
git add client/src/composables/useAuth.ts client/src/stores/appointments.ts client/src/components/LoginForm.vue
git commit -m "feat: switch client auth to HttpOnly cookie-based sessions"
```

---

### Task 6: Verify everything builds and works

**Step 1: Check for remaining references to old auth pattern**

Run: `grep -rn "x-findbolig-cookies\|rememberPassword\|auth\.cookies\|auth\.password" client/src/ server/src/`

Expected: No results (only in docs/misc files).

**Step 2: Build client**

Run: `cd client && npm run build`

Expected: Build succeeds with no errors.

**Step 3: Check server starts**

Run: `cd server && COOKIE_SECRET="test-secret-that-is-at-least-32-chars" npm run start`

Expected: Server starts without errors. Ctrl+C to stop.

**Step 4: Clear old localStorage data**

Users will need to clear their localStorage once (the old `auth` key contains `cookies` and `password` fields that are no longer used). The Pinia persist plugin will ignore unknown fields, but stale `isAuthenticated: true` with no cookie will cause a 401 on the first API call, which will trigger `ensureSession` → `validateSession` → 401 → `setAuthenticated(false)`. So it self-heals.

**Step 5: Final commit (if any fixups needed)**

```bash
git add -A && git commit -m "fix: address build issues from auth migration"
```

# Waiting Lists Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a "My waiting lists" page that displays all property-level waiting lists, lets the user reactivate Passive lists (single or bulk) and unsubscribe from any list, and alerts on Active→Passive transitions detected via client-side snapshot diff.

**Architecture:** Server proxies five findbolig.nu endpoints and aggregates per-residence application rows into per-property `WaitingList` objects. Frontend mirrors the offers feature pattern: Pinia store with localStorage cache, status-grouped list view, detail sheet, and a confirmation dialog. The novel piece is a client-side snapshot diff that detects status flips between refreshes and surfaces them via a banner.

**Tech Stack:** Vue 3, Pinia, Tailwind CSS, Hono.js, Zod, Swiper.js, vue-i18n

**Spec:** `docs/superpowers/specs/2026-05-22-waiting-lists-management-design.md`

**Note on testing:** This codebase has no automated test runner. "Verify" steps use `vue-tsc` typecheck (client), `tsc --noEmit` (server), dev-server runtime checks, and manual demo-mode smoke tests — matching the offers-feature plan's verification pattern.

---

## Chunk 1: Backend — Types, Service, Aggregation, Routes

### Task 1: Add `WaitingList` shared types

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: Append types to `shared/types.ts`**

Add at the bottom of the file:

```typescript
export type WaitingListStatus = "Active" | "Passive";

export type WaitingList = {
  propertyId: string;
  status: WaitingListStatus;

  // Property metadata (from /api/search)
  propertyShortId: number;             // for building the findbolig.nu link
  name: string;                        // e.g. "Hasselgården"
  address: string;                     // e.g. "Ålekistevej 59. m. fl, 2720 Vanløse"
  city: string;
  postalCode: number;
  location: { latitude: number; longitude: number } | null;
  images: string[];                    // residence photos, [0] is hero
  blueprints: string[];

  // Rent / size range
  minRent: number;
  maxRent: number;
  minRooms: number;
  maxRooms: number;
  minArea: number;
  maxArea: number;
  residencesCount: number;             // total residences in property

  // User's application footprint
  residencesAppliedCount: number;
  bestPosition: number | null;
  appliedSince: string;                // ISO

  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
};

// Client-side persisted snapshot for status-flip detection
export type WaitingListSnapshot = {
  propertyId: string;
  status: WaitingListStatus;
  observedAt: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add shared/types.ts
git commit -m "feat(waiting-lists): add WaitingList and WaitingListSnapshot shared types"
```

---

### Task 2: Add server-side zod schemas for raw API shapes

**Files:**
- Create: `server/src/types/waiting-lists.ts`

- [ ] **Step 1: Create the file**

```typescript
import { z } from "zod";

const ApiResidenceApplication = z.object({
  residenceId: z.string(),
  propertyId: z.string(),
  companyId: z.string(),
  userId: z.string(),
  inactiveDate: z.string().nullable(),
  status: z.enum(["Active", "Passive"]),
  created: z.string(),
});

export type ApiResidenceApplication = z.infer<typeof ApiResidenceApplication>;

// Property search results return many fields; only the ones we actually consume are typed strictly.
// The rest are kept as `passthrough` to avoid breaking on upstream additions.
const ApiPropertySearchResult = z.object({
  id: z.string(),                       // propertyId
  shortId: z.number(),
  name: z.string(),
  street: z.string(),
  number: z.union([z.number(), z.string()]).nullable().optional(),
  postalCode: z.number(),
  postalCodeName: z.string(),
  city: z.string(),
  propertyAddress: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  media: z
    .object({
      images: z.array(z.string()),
      blueprints: z.array(z.string()),
    })
    .passthrough(),
  companyLogo: z.string().nullable().optional(),
  organizationLogo: z.string().nullable().optional(),
  propertyOrganizationId: z.string(),
  propertyOrganizationName: z.string(),
  propertyCompanyId: z.string(),
  propertyCompanyName: z.string(),
  residencesCount: z.number(),
  minRooms: z.number(),
  maxRooms: z.number(),
  minArea: z.number(),
  maxArea: z.number(),
  minRent: z.number(),
  maxRent: z.number(),
}).passthrough();

export type ApiPropertySearchResult = z.infer<typeof ApiPropertySearchResult>;

const ApiPropertySearchPage = z.object({
  facets: z.any(),
  totalResults: z.number(),
  page: z.number(),
  pageSize: z.number(),
  results: z.array(ApiPropertySearchResult),
});

export type ApiPropertySearchPage = z.infer<typeof ApiPropertySearchPage>;

// Position-for-property — exact shape unknown until first call.
// The mapper handles either a bare number, or an array of {residenceId, position}.
// Define a permissive type and narrow at the mapper.
export type ApiPositionForProperty =
  | number
  | { residenceId: string; position: number }[]
  | { position: number }
  | unknown;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/types/waiting-lists.ts
git commit -m "feat(waiting-lists): add zod schemas for residence-applications and property search"
```

---

### Task 3: Add domain mapper `mapWaitingListToDomain`

**Files:**
- Modify: `server/src/lib/findbolig-domain.ts`

- [ ] **Step 1: Extend imports**

At the top of `server/src/lib/findbolig-domain.ts`, change:

```typescript
import type { Appointment, Offer, RecipientState, UserData } from "@/types";
```

to:

```typescript
import type { Appointment, Offer, RecipientState, UserData, WaitingList, WaitingListStatus } from "@/types";
```

And add the new import:

```typescript
import type { ApiPositionForProperty, ApiPropertySearchResult, ApiResidenceApplication } from "~/types/waiting-lists";
```

- [ ] **Step 2: Add `extractBestPosition` helper**

Append this private helper to `server/src/lib/findbolig-domain.ts`:

```typescript
/**
 * The position-for-property endpoint may return:
 *   - a bare number ("your best position is X")
 *   - { position: X }
 *   - an array of { residenceId, position } per applied residence
 * We accept all three and return the lowest (best) position or null.
 */
function extractBestPosition(raw: ApiPositionForProperty): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "object" && raw !== null) {
    if (Array.isArray(raw)) {
      const positions = raw
        .map((r: any) => (typeof r?.position === "number" ? r.position : null))
        .filter((n): n is number => n !== null && Number.isFinite(n));
      return positions.length ? Math.min(...positions) : null;
    }
    const single = (raw as any).position;
    if (typeof single === "number" && Number.isFinite(single)) return single;
  }
  return null;
}
```

- [ ] **Step 3: Add `mapWaitingListToDomain`**

Append after `mapOfferToDomain`:

```typescript
export function mapWaitingListToDomain({
  applications,
  property,
  position,
  imageBaseUrl,
}: {
  applications: ApiResidenceApplication[];   // all rows for one propertyId
  property: ApiPropertySearchResult;
  position: ApiPositionForProperty | null;
  imageBaseUrl?: string;                     // unused, but reserved if we want to absolute-ify
}): WaitingList {
  if (applications.length === 0) {
    throw new Error(`mapWaitingListToDomain called with empty applications for property ${property.id}`);
  }

  // Status: any-Active → Active, all-Passive → Passive (matches property-level set-active semantic)
  const status: WaitingListStatus = applications.some((a) => a.status === "Active") ? "Active" : "Passive";

  // appliedSince: earliest `created`
  const appliedSince = applications.reduce(
    (earliest, a) => (a.created < earliest ? a.created : earliest),
    applications[0].created,
  );

  return {
    propertyId: property.id,
    status,
    propertyShortId: property.shortId,
    name: property.name,
    address: property.propertyAddress,
    city: property.city,
    postalCode: property.postalCode,
    location: { latitude: property.latitude, longitude: property.longitude },
    images: property.media.images,
    blueprints: property.media.blueprints,
    minRent: property.minRent,
    maxRent: property.maxRent,
    minRooms: property.minRooms,
    maxRooms: property.maxRooms,
    minArea: property.minArea,
    maxArea: property.maxArea,
    residencesCount: property.residencesCount,
    residencesAppliedCount: applications.length,
    bestPosition: extractBestPosition(position),
    appliedSince,
    organization: {
      id: property.propertyOrganizationId,
      name: property.propertyOrganizationName,
      logoUrl: property.organizationLogo ?? null,
    },
    company: {
      id: property.propertyCompanyId,
      name: property.propertyCompanyName,
      logoUrl: property.companyLogo ?? null,
    },
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/findbolig-domain.ts
git commit -m "feat(waiting-lists): add mapWaitingListToDomain and extractBestPosition"
```

---

### Task 4: Add service functions for waiting lists

**Files:**
- Modify: `server/src/findbolig-service.ts`

- [ ] **Step 1: Extend imports**

Near the existing `mapOfferToDomain` import in `server/src/findbolig-service.ts`, change the imports to include the new mapper and the waiting-list types:

```typescript
import { apiResidenceToDomain, apiUserDataToDomain, mapAppointmentToDomain, mapOfferToDomain, mapWaitingListToDomain } from "~/lib/findbolig-domain";
```

Add a new import line:

```typescript
import type { ApiPositionForProperty, ApiPropertySearchPage, ApiResidenceApplication } from "~/types/waiting-lists";
```

- [ ] **Step 2: Add `fetchResidenceApplications`**

Append, after `getUpcomingAppointments`/`getActiveOffers`:

```typescript
/** Fetches raw residence-application rows (one per applied residence) for the current user. */
export async function fetchResidenceApplications(cookies: string): Promise<ApiResidenceApplication[]> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/data/residence-applications`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
      },
    },
    TIMEOUT_DATA,
  );

  if (!res.ok) {
    throw new UpstreamHttpError(
      `Failed to fetch residence applications: ${res.status}`,
      res.status,
    );
  }

  return (await res.json()) as ApiResidenceApplication[];
}
```

- [ ] **Step 3: Add `searchPropertiesByIds`**

```typescript
/** Fetches property metadata for a batch of propertyIds using the search endpoint. */
export async function searchPropertiesByIds(
  propertyIds: string[],
  cookies: string,
): Promise<ApiPropertySearchPage["results"]> {
  if (propertyIds.length === 0) return [];

  const res = await fetchWithTimeout(
    `${BASE_URL}/api/search`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        filters: { propertyId: propertyIds },
        mixedResults: true,
        pageSize: propertyIds.length,
      }),
    },
    TIMEOUT_DATA,
  );

  if (!res.ok) {
    throw new UpstreamHttpError(
      `Failed to search properties: ${res.status}`,
      res.status,
    );
  }

  const data = (await res.json()) as ApiPropertySearchPage;
  return data.results ?? [];
}
```

- [ ] **Step 4: Add `getPositionForProperty`**

```typescript
/** Fetches the user's waiting-list position info for a property. Shape varies; see extractBestPosition. */
export async function getPositionForProperty(
  propertyId: string,
  cookies: string,
): Promise<ApiPositionForProperty | null> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/search/waiting-lists/applicants/position-for-property/${propertyId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
      },
    },
    TIMEOUT_DATA,
  );

  if (!res.ok) {
    throw new UpstreamHttpError(
      `Failed to fetch position for property ${propertyId}: ${res.status}`,
      res.status,
    );
  }

  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as ApiPositionForProperty;
}
```

- [ ] **Step 5: Add `setWaitingListActive`**

```typescript
/** Reactivates a waiting list (property-level). */
export async function setWaitingListActive(propertyId: string, cookies: string): Promise<void> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/data/residence-applications/property/${propertyId}/set-active`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
      },
    },
    TIMEOUT_DATA,
  );

  if (!res.ok) {
    throw new UpstreamHttpError(
      `Failed to set waiting list active for property ${propertyId}: ${res.status}`,
      res.status,
    );
  }
}
```

- [ ] **Step 6: Add `unsubscribeFromWaitingList`**

```typescript
/** Unsubscribes the user from a waiting list (property-level). Upstream returns 204. */
export async function unsubscribeFromWaitingList(propertyId: string, cookies: string): Promise<void> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/data/residence-applications/property/${propertyId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
      },
    },
    TIMEOUT_DATA,
  );

  if (!res.ok) {
    throw new UpstreamHttpError(
      `Failed to unsubscribe from waiting list for property ${propertyId}: ${res.status}`,
      res.status,
    );
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add server/src/findbolig-service.ts
git commit -m "feat(waiting-lists): add CRUD service functions"
```

---

### Task 5: Add aggregation `getWaitingLists`

**Files:**
- Modify: `server/src/findbolig-service.ts`

- [ ] **Step 1: Add a small in-house p-limit helper**

Add at the bottom of `server/src/findbolig-service.ts` (before the `getUserData`/`refreshSession` block — placement doesn't matter, but keep it near `getWaitingLists`):

```typescript
/** Minimal concurrency limiter — runs at most `limit` tasks in parallel, preserving input order. */
async function pLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
```

- [ ] **Step 2: Add `getWaitingLists`**

Append in `server/src/findbolig-service.ts`:

```typescript
/**
 * Aggregates per-residence application rows into per-property WaitingList objects,
 * enriching with property metadata (from /api/search) and best-position info.
 */
export async function getWaitingLists(cookies: string) {
  const applications = await fetchResidenceApplications(cookies);

  // Group by propertyId
  const byProperty = new Map<string, ApiResidenceApplication[]>();
  for (const app of applications) {
    const list = byProperty.get(app.propertyId);
    if (list) list.push(app);
    else byProperty.set(app.propertyId, [app]);
  }

  const propertyIds = Array.from(byProperty.keys());
  if (propertyIds.length === 0) return [];

  // One batched search for all properties
  const properties = await searchPropertiesByIds(propertyIds, cookies);
  const propertyById = new Map(properties.map((p) => [p.id, p]));

  // Per-property position fetches with concurrency cap 5
  const positions = await pLimit(propertyIds, 5, async (propertyId) => {
    try {
      return await getPositionForProperty(propertyId, cookies);
    } catch (err) {
      console.warn(`Position fetch failed for ${propertyId}:`, err);
      return null;
    }
  });

  // Map and merge
  const lists = propertyIds.map((propertyId, i) => {
    const property = propertyById.get(propertyId);
    if (!property) {
      console.warn(`No property metadata found for ${propertyId} — skipping`);
      return null;
    }
    const apps = byProperty.get(propertyId)!;
    return mapWaitingListToDomain({
      applications: apps,
      property,
      position: positions[i],
    });
  });

  return lists.filter((l): l is NonNullable<typeof l> => l !== null);
}
```

- [ ] **Step 3: Verify server typechecks**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors. If any type errors surface (e.g. an `ApiPositionForProperty` cast), fix in-place.

- [ ] **Step 4: Commit**

```bash
git add server/src/findbolig-service.ts
git commit -m "feat(waiting-lists): add getWaitingLists aggregation with concurrency-capped fetches"
```

---

### Task 6: Add API routes for waiting lists

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add the `waitingLists` sub-app**

In `server/src/index.ts`, near the other sub-apps (around line 49, alongside `appointments = new Hono().basePath("/appointments")`):

```typescript
const waitingLists = new Hono().basePath("/waiting-lists");
```

- [ ] **Step 2: Add the three route handlers**

After the `residences.get(...)` handler (around line 265), add:

```typescript
waitingLists.get("/", async (c) => {
  try {
    const result = await withReauth(c, (cookies) =>
      findboligService.getWaitingLists(cookies)
    );
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});

waitingLists.post("/:propertyId/set-active", async (c) => {
  try {
    const propertyId = c.req.param("propertyId");
    if (!propertyId) return c.json({ error: "Property ID is required" }, 400);
    await withReauth(c, (cookies) =>
      findboligService.setWaitingListActive(propertyId, cookies)
    );
    return c.json({ ok: true });
  } catch (error) {
    return handleError(c, error);
  }
});

waitingLists.delete("/:propertyId", async (c) => {
  try {
    const propertyId = c.req.param("propertyId");
    if (!propertyId) return c.json({ error: "Property ID is required" }, 400);
    await withReauth(c, (cookies) =>
      findboligService.unsubscribeFromWaitingList(propertyId, cookies)
    );
    return c.json({ ok: true });
  } catch (error) {
    return handleError(c, error);
  }
});
```

- [ ] **Step 3: Mount the sub-app**

After `api.route("/", appointments);` (around line 272), add:

```typescript
api.route("/", waitingLists);
```

- [ ] **Step 4: Verify server typechecks**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual server smoke test (required — this is the only end-to-end gate before client work)**

Start the server (`npm run dev:server`), log in via the client at least once so a session cookie is set, then with that cookie:

```bash
curl -i --cookie "fb_session=<your-session-cookie>" http://localhost:3000/api/waiting-lists/
```

Expected: 200 with a JSON array of `WaitingList` objects (or `[]` if you have no applications). At least confirm:
- `propertyId`, `status`, `name`, `address` are populated on each entry
- `bestPosition` is either a number or `null` (never `undefined`)
- `organization.name` and `organization.logoUrl` are populated

If any field is missing or the shape diverges, fix the mapper or `extractBestPosition` before moving on.

- [ ] **Step 6: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(waiting-lists): add GET, POST set-active, DELETE routes"
```

---

## Chunk 2: Client foundation — i18n, data layer, store

### Task 7: Add i18n strings for waiting lists

**Files:**
- Modify: `client/src/i18n/locales/da.json`
- Modify: `client/src/i18n/locales/en.json`

- [ ] **Step 1: Add the `waitingLists` block to `da.json`**

Insert after the existing `offers` block in `client/src/i18n/locales/da.json` (before `financials`). Use this content:

```jsonc
"waitingLists": {
  "pageTitle": "Ventelister",
  "count": "{count} venteliste | {count} ventelister",
  "refresh": "Opdatér",
  "emptyTitle": "Du er ikke skrevet op til nogen ventelister",
  "emptyDescription": "Find boliger på FindBolig.nu og skriv dig op til en venteliste for at modtage tilbud.",
  "groups": {
    "passive": "Passive",
    "active": "Aktive"
  },
  "card": {
    "bestPosition": "Bedste placering",
    "noPosition": "—",
    "residencesApplied": "Skrevet op til {count} bolig | Skrevet op til {count} boliger",
    "rentRange": "{min} – {max} kr/md",
    "statusActive": "Aktiv",
    "statusPassive": "Passiv",
    "reactivate": "Meld mig aktiv"
  },
  "detail": {
    "rent": "Husleje",
    "rooms": "{min}–{max} værelser",
    "area": "{min}–{max} m²",
    "appliedSince": "Skrevet op siden {date}",
    "openOnFindbolig": "Åbn på findbolig.nu",
    "dangerZone": "Fareområde",
    "unsubscribe": "Fjern mig fra ventelisten"
  },
  "actions": {
    "reactivateAll": "Aktivér alle",
    "reactivating": "Aktiverer {done} af {total}…",
    "reactivateAllSuccess": "{count} venteliste aktiveret | {count} ventelister aktiveret",
    "reactivateAllPartial": "{done} af {total} aktiveret — {failed} fejlede",
    "reactivateSuccess": "{name} er nu aktiv",
    "reactivateFailed": "Kunne ikke aktivere {name}",
    "unsubscribeSuccess": "Du er fjernet fra {name}",
    "unsubscribeFailed": "Kunne ikke fjerne dig fra {name}"
  },
  "banner": {
    "title": "Du er blevet sat passiv",
    "body": "{count} venteliste er gået passiv siden sidst. Aktivér den igen for at modtage tilbud. | {count} ventelister er gået passive siden sidst. Aktivér dem igen for at modtage tilbud.",
    "dismiss": "Afvis"
  },
  "confirm": {
    "unsubscribeTitle": "Fjern dig fra {name}?",
    "unsubscribeBody": "Du mister din anciennitet og skal starte forfra hvis du skriver dig op igen. Dette kan ikke fortrydes.",
    "cancel": "Annullér",
    "confirm": "Fjern mig"
  }
},
```

- [ ] **Step 2: Add the equivalent block to `en.json`**

Same key structure, English translation:

```jsonc
"waitingLists": {
  "pageTitle": "Waiting lists",
  "count": "{count} waiting list | {count} waiting lists",
  "refresh": "Refresh",
  "emptyTitle": "You are not on any waiting lists",
  "emptyDescription": "Find properties on FindBolig.nu and sign up to a waiting list to receive offers.",
  "groups": {
    "passive": "Passive",
    "active": "Active"
  },
  "card": {
    "bestPosition": "Best position",
    "noPosition": "—",
    "residencesApplied": "Signed up for {count} residence | Signed up for {count} residences",
    "rentRange": "{min} – {max} kr/mo",
    "statusActive": "Active",
    "statusPassive": "Passive",
    "reactivate": "Set active"
  },
  "detail": {
    "rent": "Rent",
    "rooms": "{min}–{max} rooms",
    "area": "{min}–{max} m²",
    "appliedSince": "Applied since {date}",
    "openOnFindbolig": "Open on findbolig.nu",
    "dangerZone": "Danger zone",
    "unsubscribe": "Remove me from waiting list"
  },
  "actions": {
    "reactivateAll": "Reactivate all",
    "reactivating": "Reactivating {done} of {total}…",
    "reactivateAllSuccess": "{count} waiting list reactivated | {count} waiting lists reactivated",
    "reactivateAllPartial": "{done} of {total} reactivated — {failed} failed",
    "reactivateSuccess": "{name} is now active",
    "reactivateFailed": "Could not reactivate {name}",
    "unsubscribeSuccess": "You have been removed from {name}",
    "unsubscribeFailed": "Could not remove you from {name}"
  },
  "banner": {
    "title": "You have been set passive",
    "body": "{count} waiting list has gone passive since last refresh. Reactivate it to keep receiving offers. | {count} waiting lists have gone passive since last refresh. Reactivate them to keep receiving offers.",
    "dismiss": "Dismiss"
  },
  "confirm": {
    "unsubscribeTitle": "Remove yourself from {name}?",
    "unsubscribeBody": "You will lose your seniority and have to start over if you re-apply. This cannot be undone.",
    "cancel": "Cancel",
    "confirm": "Remove me"
  }
},
```

- [ ] **Step 3: Add a nav entry key**

Inside the `"nav"` block in both `da.json` and `en.json`, add the `waitingLists` key:

```jsonc
// da.json
"waitingLists": "Ventelister"

// en.json
"waitingLists": "Waiting lists"
```

- [ ] **Step 4: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('client/src/i18n/locales/da.json','utf8'))" \
  && node -e "JSON.parse(require('fs').readFileSync('client/src/i18n/locales/en.json','utf8'))"
```

Expected: no output (success).

- [ ] **Step 5: Commit**

```bash
git add client/src/i18n/locales/da.json client/src/i18n/locales/en.json
git commit -m "feat(waiting-lists): add i18n strings (da, en)"
```

---

### Task 8: Add mock waiting-lists data

**Files:**
- Create: `client/src/data/MOCK_WAITING_LISTS.json`

- [ ] **Step 1: Create the mock file**

Create `client/src/data/MOCK_WAITING_LISTS.json` with the four fixtures described in the spec (Active typical, Passive without position, Active variety, Passive with position).

Use the data from the user's sample search results (`9f6b3be9-...`, `69303b76-...`, `cc8639df-...`, `8f959523-...`) — these are real property IDs from the sample, paired with status overrides and synthesised position info.

```json
[
  {
    "propertyId": "69303b76-1b87-475c-a329-60ea8b666ecf",
    "status": "Active",
    "propertyShortId": 1722,
    "name": "Hasselgården",
    "address": "Ålekistevej 59. m. fl, 2720 Vanløse",
    "city": "Vanløse",
    "postalCode": 2720,
    "location": { "latitude": 55.68148, "longitude": 12.4833 },
    "images": [
      "/data/media/69303b76-1b87-475c-a329-60ea8b666ecf/165d7b03-818c-474e-9eab-128fb7695bf0.png",
      "/data/media/69303b76-1b87-475c-a329-60ea8b666ecf/256d4bd7-d76a-4ae6-9cc0-f01061a80c0a.png"
    ],
    "blueprints": [],
    "minRent": 3104.85,
    "maxRent": 9401,
    "minRooms": 1,
    "maxRooms": 3,
    "minArea": 44,
    "maxArea": 88,
    "residencesCount": 69,
    "residencesAppliedCount": 18,
    "bestPosition": 333,
    "appliedSince": "2025-10-16T16:07:05.1260437Z",
    "organization": {
      "id": "8d5cb9e8-feba-4bc3-b61b-56fd9d0a42ab",
      "name": "PFA",
      "logoUrl": "/sitecore/shell/-/media/findbolig/content/udlejere/pfa/pfa.jpg"
    },
    "company": {
      "id": "37844dfa-4cf2-419b-bbf2-44b4fe5aab58",
      "name": "PFA (Capital Investment)",
      "logoUrl": "/data/media/37844dfa-4cf2-419b-bbf2-44b4fe5aab58/46ea5ba8-8f9a-4ab1-a08b-dca72d3b3c7d.png"
    }
  },
  {
    "propertyId": "8f959523-3e9c-471a-8425-db750c9e2b78",
    "status": "Passive",
    "propertyShortId": 1681,
    "name": "Vodroffsvej 16",
    "address": "Vodroffsvej 16, 1900 Frederiksberg C",
    "city": "Frederiksberg C",
    "postalCode": 1900,
    "location": { "latitude": 55.67649, "longitude": 12.55454 },
    "images": [
      "/data/media/8f959523-3e9c-471a-8425-db750c9e2b78/o_1e7gvpg37s7l1g2ms6k1iu2j1md.jpg"
    ],
    "blueprints": [],
    "minRent": 7365.95,
    "maxRent": 22468.5,
    "minRooms": 2,
    "maxRooms": 3,
    "minArea": 93.7,
    "maxArea": 143.3,
    "residencesCount": 11,
    "residencesAppliedCount": 2,
    "bestPosition": null,
    "appliedSince": "2025-12-01T17:34:53.5591409Z",
    "organization": {
      "id": "8d5cb9e8-feba-4bc3-b61b-56fd9d0a42ab",
      "name": "PFA",
      "logoUrl": "/sitecore/shell/-/media/findbolig/content/udlejere/pfa/pfa.jpg"
    },
    "company": {
      "id": "d158a575-baa5-436b-8c86-3f87c320273a",
      "name": "PFA (DEAS)",
      "logoUrl": "/data/media/d158a575-baa5-436b-8c86-3f87c320273a/49115653-4310-4390-9bbd-3c45383c1318.png"
    }
  },
  {
    "propertyId": "cc8639df-1e69-42d2-b197-a50f3f1bbc78",
    "status": "Active",
    "propertyShortId": 1253,
    "name": "Enighedsvej 16 & 16 A - B",
    "address": "Enighedsvej 16, 2920 Charlottenlund",
    "city": "Charlottenlund",
    "postalCode": 2920,
    "location": { "latitude": 55.75298, "longitude": 12.56833 },
    "images": [
      "/data/media/cc8639df-1e69-42d2-b197-a50f3f1bbc78/f5004dcb-a45d-437c-956c-e1e0f703411c.jpg",
      "/data/media/cc8639df-1e69-42d2-b197-a50f3f1bbc78/4875cd95-c385-4f2a-a7ff-0852aa18c79d.jpg"
    ],
    "blueprints": [],
    "minRent": 686.05,
    "maxRent": 14240.49,
    "minRooms": 1,
    "maxRooms": 6,
    "minArea": 9,
    "maxArea": 210,
    "residencesCount": 42,
    "residencesAppliedCount": 5,
    "bestPosition": 12,
    "appliedSince": "2023-04-12T10:30:00Z",
    "organization": {
      "id": "116e5561-b5b3-458d-8f68-7729aab755d3",
      "name": "Sampension",
      "logoUrl": "/sitecore/shell/-/media/findbolig/content/udlejere/sampension/sampension/sampension_logo_primre_rgb.jpg"
    },
    "company": {
      "id": "5868a396-7fb0-459f-9b2e-00c0ae8d094c",
      "name": "Sampension",
      "logoUrl": "/data/media/5868a396-7fb0-459f-9b2e-00c0ae8d094c/d49a0d4c-dac0-4dd4-b451-e4f9ca799f6a.jpg"
    }
  },
  {
    "propertyId": "9f6b3be9-b383-4989-b967-69b34d827ba3",
    "status": "Passive",
    "propertyShortId": 2184,
    "name": "Vigerslevvej 41-57C",
    "address": "Vigerslevvej 41-57C, 2500 Valby",
    "city": "Valby",
    "postalCode": 2500,
    "location": { "latitude": 55.66829, "longitude": 12.48835 },
    "images": [
      "/data/media/9f6b3be9-b383-4989-b967-69b34d827ba3/2b8144c9-fb8c-4a0c-a9fe-5142cdf28d43.jpg",
      "/data/media/9f6b3be9-b383-4989-b967-69b34d827ba3/1341e960-ca1f-4e6f-b0d3-c16bc2b8df03.jpg"
    ],
    "blueprints": [],
    "minRent": 2572.85,
    "maxRent": 12198.16,
    "minRooms": 1,
    "maxRooms": 4,
    "minArea": 58,
    "maxArea": 104,
    "residencesCount": 66,
    "residencesAppliedCount": 8,
    "bestPosition": 47,
    "appliedSince": "2024-02-14T09:00:00Z",
    "organization": {
      "id": "8d5cb9e8-feba-4bc3-b61b-56fd9d0a42ab",
      "name": "PFA",
      "logoUrl": "/sitecore/shell/-/media/findbolig/content/udlejere/pfa/pfa.jpg"
    },
    "company": {
      "id": "37844dfa-4cf2-419b-bbf2-44b4fe5aab58",
      "name": "PFA (Capital Investment)",
      "logoUrl": "/data/media/37844dfa-4cf2-419b-bbf2-44b4fe5aab58/46ea5ba8-8f9a-4ab1-a08b-dca72d3b3c7d.png"
    }
  }
]
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('client/src/data/MOCK_WAITING_LISTS.json','utf8'))"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add client/src/data/MOCK_WAITING_LISTS.json
git commit -m "feat(waiting-lists): add mock data covering active/passive UI states"
```

---

### Task 9: Add `waitingListsSource.ts` (API layer)

**Files:**
- Create: `client/src/data/waitingListsSource.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { WaitingList } from "@/types";
import config from "~/config";
import MOCK_WAITING_LISTS from "~/data/MOCK_WAITING_LISTS.json";
import { HttpError } from "./appointmentsSource";

const TIMEOUT_FETCH = 90_000;
const TIMEOUT_ACTION = 25_000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function fetchWaitingLists(): Promise<{ updatedAt: Date; lists: WaitingList[] }> {
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { updatedAt: new Date(), lists: MOCK_WAITING_LISTS as WaitingList[] };
  }

  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/waiting-lists/`,
    { method: "GET", credentials: "include" },
    TIMEOUT_FETCH,
  );

  if (!res.ok) {
    throw new HttpError(`Failed to fetch waiting lists: ${res.status}`, res.status);
  }

  const data = await res.json();
  return { updatedAt: new Date(), lists: data as WaitingList[] };
}

export async function setWaitingListActive(propertyId: string): Promise<void> {
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return;
  }
  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/waiting-lists/${propertyId}/set-active`,
    { method: "POST", credentials: "include" },
    TIMEOUT_ACTION,
  );
  if (!res.ok) {
    throw new HttpError(`Failed to set waiting list active: ${res.status}`, res.status);
  }
}

export async function unsubscribeFromWaitingList(propertyId: string): Promise<void> {
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return;
  }
  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/waiting-lists/${propertyId}`,
    { method: "DELETE", credentials: "include" },
    TIMEOUT_ACTION,
  );
  if (!res.ok) {
    throw new HttpError(`Failed to unsubscribe from waiting list: ${res.status}`, res.status);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/data/waitingListsSource.ts
git commit -m "feat(waiting-lists): add client API layer"
```

---

### Task 10: Add `waitingLists.ts` (cache + snapshots)

**Files:**
- Create: `client/src/data/waitingLists.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { WaitingList, WaitingListSnapshot } from "@/types";
import { useToastStore } from "~/stores/toast";
import { fetchWaitingLists } from "./waitingListsSource";

const STORAGE_KEY = "waiting_lists_cache";
const SNAPSHOTS_KEY = "waiting_lists_snapshots";

export function getWaitingListsCacheAge(): number | null {
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

export function persistWaitingListsCache(lists: WaitingList[], updatedAt: Date | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ updatedAt, lists }));
}

export function isWaitingListsCacheStale(thresholdMs = 24 * 60 * 60 * 1000): boolean {
  const age = getWaitingListsCacheAge();
  if (age === null) return false;
  return age > thresholdMs;
}

export async function getWaitingLists(forceRefresh: boolean = false) {
  if (!forceRefresh) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          updatedAt: new Date(parsed.updatedAt),
          lists: parsed.lists as WaitingList[],
        };
      } catch {
        const toast = useToastStore();
        toast.warning("Failed to load cached data, fetching fresh data...");
      }
    }
  }

  const payload = await fetchWaitingLists();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearWaitingListsCache() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Snapshots (for status-flip detection) ──────────────────────────────

export function getSnapshots(): WaitingListSnapshot[] {
  const raw = localStorage.getItem(SNAPSHOTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WaitingListSnapshot[];
  } catch {
    return [];
  }
}

export function persistSnapshots(snapshots: WaitingListSnapshot[]): void {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export function clearSnapshots(): void {
  localStorage.removeItem(SNAPSHOTS_KEY);
}

/**
 * Pure diff helper. Returns propertyIds that just flipped Active → Passive
 * compared to the previous snapshots. New lists (no prior snapshot) are not alerts.
 */
export function detectPassivated(
  lists: WaitingList[],
  prevSnapshots: WaitingListSnapshot[],
): string[] {
  const prevByProperty = new Map(prevSnapshots.map((s) => [s.propertyId, s]));
  const flipped: string[] = [];
  for (const list of lists) {
    if (list.status !== "Passive") continue;
    const prev = prevByProperty.get(list.propertyId);
    if (prev && prev.status === "Active") {
      flipped.push(list.propertyId);
    }
  }
  return flipped;
}

/** Builds fresh snapshots from current lists. */
export function buildSnapshots(lists: WaitingList[], observedAt: Date = new Date()): WaitingListSnapshot[] {
  const iso = observedAt.toISOString();
  return lists.map((l) => ({
    propertyId: l.propertyId,
    status: l.status,
    observedAt: iso,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/data/waitingLists.ts
git commit -m "feat(waiting-lists): add cache + snapshot diff helpers"
```

---

### Task 11: Add `useGroupWaitingLists` composable

**Files:**
- Create: `client/src/composables/useGroupWaitingLists.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { WaitingList } from "@/types";
import { computed, type Ref } from "vue";

export type GroupedWaitingLists = {
  key: "passive" | "active";
  label: string;
  lists: WaitingList[];
  isFirst: boolean;
}[];

export function useGroupWaitingLists(lists: Ref<WaitingList[]>, t: (key: string) => string) {
  const grouped = computed<GroupedWaitingLists>(() => {
    const passive = lists.value
      .filter((l) => l.status === "Passive")
      .sort((a, b) => a.name.localeCompare(b.name, "da"));

    const active = lists.value
      .filter((l) => l.status === "Active")
      .sort((a, b) => a.name.localeCompare(b.name, "da"));

    const groups: GroupedWaitingLists = [];

    if (passive.length > 0) {
      groups.push({
        key: "passive",
        label: t("waitingLists.groups.passive"),
        lists: passive,
        isFirst: true,
      });
    }

    if (active.length > 0) {
      groups.push({
        key: "active",
        label: t("waitingLists.groups.active"),
        lists: active,
        isFirst: groups.length === 0,
      });
    }

    return groups;
  });

  return { grouped };
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/composables/useGroupWaitingLists.ts
git commit -m "feat(waiting-lists): add useGroupWaitingLists composable"
```

---

### Task 12: Add Pinia store `useWaitingListsStore`

**Files:**
- Create: `client/src/stores/waitingLists.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { WaitingList } from "@/types";
import { defineStore, storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { useAuth } from "~/composables/useAuth";
import config from "~/config";
import { handleApiError, HttpError } from "~/data/appointmentsSource";
import {
  buildSnapshots,
  clearSnapshots,
  detectPassivated,
  getSnapshots,
  getWaitingLists,
  isWaitingListsCacheStale,
  persistSnapshots,
  persistWaitingListsCache,
} from "~/data/waitingLists";
import {
  fetchWaitingLists,
  setWaitingListActive as apiSetActive,
  unsubscribeFromWaitingList as apiUnsubscribe,
} from "~/data/waitingListsSource";
import { useI18n } from "~/i18n";
import { useToastStore } from "~/stores/toast";

const CONCURRENCY_REACTIVATE_ALL = 5;

export const useWaitingListsStore = defineStore("waitingLists", () => {
  const lists = ref<WaitingList[]>([]);
  const updatedAt = ref<Date | null>(null);
  const isLoading = ref(false);
  const isMutating = ref(false);
  const needsRefresh = ref(false);
  const sessionExpired = ref(false);
  const recentlyPassivated = ref<string[]>([]);

  // For "Reactivating X of N" counter
  const bulkInProgress = ref(false);
  const bulkDone = ref(0);
  const bulkTotal = ref(0);

  async function init() {
    const auth = useAuth();

    isLoading.value = true;
    try {
      // Cache-first (same path for demo and real — config.useMockData inside fetchWaitingLists handles the demo case)
      const cached = await getWaitingLists(false);
      lists.value = cached.lists;
      updatedAt.value = cached.updatedAt;

      // Demo: seed the banner once on first ever mount so the demo user can see the alert UI.
      if (auth.isDemo && getSnapshots().length === 0) {
        recentlyPassivated.value = cached.lists
          .filter((l) => l.status === "Passive")
          .map((l) => l.propertyId);
        persistSnapshots(buildSnapshots(cached.lists));
      }

      if (!auth.isDemo && !auth.isAuthenticated) {
        sessionExpired.value = true;
        return;
      }

      if (!auth.isDemo && isWaitingListsCacheStale()) {
        const sessionValid = await auth.ensureSession();
        if (sessionValid) {
          needsRefresh.value = true;
        } else {
          sessionExpired.value = true;
        }
      }
    } catch {
      if (!auth.isDemo && !auth.isAuthenticated) return;
      try {
        const payload = await getWaitingLists(true);
        lists.value = payload.lists;
        updatedAt.value = payload.updatedAt;
        runDiff(payload.lists);
      } catch (error) {
        handleApiError(error, useToastStore(), useI18n().t, "Failed to load waiting lists");
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function refresh() {
    if (isLoading.value) return;
    isLoading.value = true;
    needsRefresh.value = false;
    const auth = useAuth();

    if (auth.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      // Demo refresh keeps current lists but bumps timestamp so the page header updates.
      updatedAt.value = new Date();
      isLoading.value = false;
      return;
    }

    try {
      const payload = await getWaitingLists(true);
      runDiff(payload.lists);
      lists.value = payload.lists;
      updatedAt.value = payload.updatedAt;
    } catch (error) {
      const is401 = error instanceof HttpError && error.status === 401;
      if (is401) {
        const recovered = await auth.ensureSession();
        if (recovered) {
          try {
            const payload = await getWaitingLists(true);
            runDiff(payload.lists);
            lists.value = payload.lists;
            updatedAt.value = payload.updatedAt;
            return;
          } catch {
            // fall through
          }
        } else {
          sessionExpired.value = true;
          return;
        }
      }
      handleApiError(error, useToastStore(), useI18n().t, "Failed to refresh waiting lists");
    } finally {
      isLoading.value = false;
    }
  }

  function runDiff(newLists: WaitingList[]) {
    // detectPassivated handles empty prev snapshots correctly (returns []) — no first-load false alerts.
    const prev = getSnapshots();
    recentlyPassivated.value = detectPassivated(newLists, prev);
    persistSnapshots(buildSnapshots(newLists));
  }

  async function setActive(propertyId: string): Promise<boolean> {
    const toast = useToastStore();
    const { t } = useI18n();
    const auth = useAuth();
    const list = lists.value.find((l) => l.propertyId === propertyId);
    if (!list) return false;
    const originalStatus = list.status;

    isMutating.value = true;
    // Optimistic flip + cache write
    list.status = "Active";
    persistWaitingListsCache(lists.value, updatedAt.value);

    try {
      if (!auth.isDemo) await apiSetActive(propertyId);
      // Persist snapshot so we don't re-alert on next refresh
      persistSnapshots(buildSnapshots(lists.value));
      toast.success(t("waitingLists.actions.reactivateSuccess", { name: list.name }));
      return true;
    } catch (error) {
      // Revert
      list.status = originalStatus;
      persistWaitingListsCache(lists.value, updatedAt.value);
      handleApiError(error, toast, t, t("waitingLists.actions.reactivateFailed", { name: list.name }));
      return false;
    } finally {
      // Per spec: remove from banner whether success or failure — the user has acknowledged it.
      recentlyPassivated.value = recentlyPassivated.value.filter((id) => id !== propertyId);
      isMutating.value = false;
    }
  }

  async function reactivateAll(): Promise<void> {
    const toast = useToastStore();
    const { t } = useI18n();
    const auth = useAuth();
    const passive = lists.value.filter((l) => l.status === "Passive");
    if (passive.length === 0) return;

    bulkInProgress.value = true;
    bulkDone.value = 0;
    bulkTotal.value = passive.length;
    isMutating.value = true;

    let cursor = 0;
    const failed: WaitingList[] = [];
    let sessionExpiredDuringBulk = false;

    async function worker() {
      while (true) {
        // Short-circuit if session died — don't keep firing failing requests.
        if (sessionExpiredDuringBulk) return;
        const i = cursor++;
        if (i >= passive.length) return;
        const list = passive[i];
        try {
          if (!auth.isDemo) await apiSetActive(list.propertyId);
          list.status = "Active";
          // Persist after each successful flip so partial progress survives a tab close.
          persistWaitingListsCache(lists.value, updatedAt.value);
          recentlyPassivated.value = recentlyPassivated.value.filter((id) => id !== list.propertyId);
        } catch (error) {
          if (error instanceof HttpError && error.status === 401) {
            sessionExpiredDuringBulk = true;
            failed.push(list);
            return;
          }
          failed.push(list);
        } finally {
          bulkDone.value++;
        }
      }
    }

    const workers = Array.from(
      { length: Math.min(CONCURRENCY_REACTIVATE_ALL, passive.length) },
      () => worker(),
    );
    await Promise.all(workers);

    persistWaitingListsCache(lists.value, updatedAt.value);
    persistSnapshots(buildSnapshots(lists.value));

    bulkInProgress.value = false;
    isMutating.value = false;

    if (sessionExpiredDuringBulk) {
      const recovered = await auth.ensureSession();
      if (!recovered) {
        sessionExpired.value = true;
        return;
      }
      // Session restored — let the user retry; we don't auto-retry to avoid surprise side effects.
    }

    const succeeded = passive.length - failed.length;
    if (failed.length === 0) {
      toast.success(t("waitingLists.actions.reactivateAllSuccess", { count: succeeded }, succeeded));
    } else {
      toast.warning(
        t("waitingLists.actions.reactivateAllPartial", {
          done: succeeded,
          total: passive.length,
          failed: failed.length,
        }),
        8000,
      );
    }
  }

  async function unsubscribe(propertyId: string): Promise<boolean> {
    const toast = useToastStore();
    const { t } = useI18n();
    const auth = useAuth();
    const list = lists.value.find((l) => l.propertyId === propertyId);
    if (!list) return false;

    isMutating.value = true;
    try {
      if (!auth.isDemo) await apiUnsubscribe(propertyId);
      lists.value = lists.value.filter((l) => l.propertyId !== propertyId);
      persistWaitingListsCache(lists.value, updatedAt.value);
      // Drop its snapshot so re-applying later is treated as baseline, not a transition
      const snapshots = getSnapshots().filter((s) => s.propertyId !== propertyId);
      persistSnapshots(snapshots);
      recentlyPassivated.value = recentlyPassivated.value.filter((id) => id !== propertyId);
      toast.success(t("waitingLists.actions.unsubscribeSuccess", { name: list.name }));
      return true;
    } catch (error) {
      handleApiError(error, toast, t, t("waitingLists.actions.unsubscribeFailed", { name: list.name }));
      return false;
    } finally {
      isMutating.value = false;
    }
  }

  function dismissPassivatedBanner() {
    recentlyPassivated.value = [];
  }

  function getImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) return "";
    return `${config.imageBaseUrl}${imagePath}`;
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
    } else {
      lists.value = [];
      updatedAt.value = null;
      needsRefresh.value = false;
      sessionExpired.value = false;
      recentlyPassivated.value = [];
      clearSnapshots();
    }
  });

  return {
    lists,
    updatedAt,
    isLoading,
    isMutating,
    needsRefresh,
    sessionExpired,
    recentlyPassivated,
    bulkInProgress,
    bulkDone,
    bulkTotal,
    init,
    refresh,
    handleRefresh,
    setActive,
    reactivateAll,
    unsubscribe,
    dismissPassivatedBanner,
    getImageUrl,
  };
});
```

- [ ] **Step 2: Verify client typechecks**

```bash
cd client && npx vue-tsc --noEmit
```

Expected: no errors. If `useI18n` import from `~/i18n` doesn't expose `t`, check the existing offers store for the precise import shape and mirror it.

- [ ] **Step 3: Commit**

```bash
git add client/src/stores/waitingLists.ts
git commit -m "feat(waiting-lists): add Pinia store with optimistic updates and snapshot diff"
```

---

## Chunk 3: UI components — banner, card, group, list, confirm dialog

### Task 13: Create `PassivatedBanner.vue`

**Files:**
- Create: `client/src/components/waitingList/PassivatedBanner.vue`

- [ ] **Step 1: Create the directory and component file**

```bash
mkdir -p client/src/components/waitingList
```

Create `client/src/components/waitingList/PassivatedBanner.vue`:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useWaitingListsStore } from "~/stores/waitingLists";

const { t } = useI18n();
const store = useWaitingListsStore();

const affected = computed(() =>
  store.lists.filter((l) => store.recentlyPassivated.includes(l.propertyId)),
);

const count = computed(() => affected.value.length);

const nameList = computed(() => affected.value.map((l) => l.name).join(", "));
</script>

<template>
  <div
    v-if="count > 0"
    class="mb-3 p-3 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {{ t("waitingLists.banner.title") }}
        </p>
        <p class="mt-1 text-xs text-amber-800 dark:text-amber-300/90 leading-snug">
          {{ t("waitingLists.banner.body", { count }, count) }}
        </p>
        <p
          v-if="nameList"
          class="mt-1 text-xs text-amber-700/80 dark:text-amber-300/70 truncate"
          :title="nameList"
        >
          {{ nameList }}
        </p>
      </div>
      <button
        class="shrink-0 p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
        :aria-label="t('waitingLists.banner.dismiss')"
        @click="store.dismissPassivatedBanner()"
      >
        <img src="/icons/x.svg" alt="" class="size-4 opacity-60 dark:invert" />
      </button>
    </div>
    <button
      class="mt-2 w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
      :disabled="store.isMutating"
      @click="store.reactivateAll()"
    >
      <template v-if="store.bulkInProgress">
        {{ t("waitingLists.actions.reactivating", { done: store.bulkDone, total: store.bulkTotal }) }}
      </template>
      <template v-else>
        {{ t("waitingLists.actions.reactivateAll") }}
      </template>
    </button>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/waitingList/PassivatedBanner.vue
git commit -m "feat(waiting-lists): add PassivatedBanner component"
```

---

### Task 14: Create `WaitingListCard.vue`

**Files:**
- Create: `client/src/components/waitingList/card/WaitingListCard.vue`

- [ ] **Step 1: Create the directory, write a stub for the detail sheet, and write the card**

```bash
mkdir -p client/src/components/waitingList/card client/src/components/waitingList/detail
```

`WaitingListCard.vue` (below) imports `../detail/WaitingListDetailSheet.vue`, which is implemented properly in Chunk 4 / Task 17. To keep the build green at the chunk boundary, drop a minimal stub now:

Create `client/src/components/waitingList/detail/WaitingListDetailSheet.vue` with:

```vue
<script setup lang="ts">
import type { WaitingList } from "@/types";

defineProps<{ list: WaitingList }>();
defineEmits<{ close: []; "after-leave": [] }>();
</script>

<template>
  <!-- Stub — replaced by full implementation in Task 17 -->
  <div hidden />
</template>
```

Then create `client/src/components/waitingList/card/WaitingListCard.vue`:

```vue
<script setup lang="ts">
import type { WaitingList } from "@/types";
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import { compactThumb } from "~/lib/imageTransform";
import { formatCurrency } from "~/lib/formatters";
import { useWaitingListsStore } from "~/stores/waitingLists";
import WaitingListDetailSheet from "../detail/WaitingListDetailSheet.vue";

const { t } = useI18n();
const store = useWaitingListsStore();
const { getImageUrl } = store;

const props = defineProps<{
  list: WaitingList;
  loadImage?: boolean;
}>();

const showDetail = ref(false);
const detailMounted = ref(false);

function openDetail() {
  showDetail.value = true;
  detailMounted.value = true;
}

function onDetailClose() {
  showDetail.value = false;
}

async function onDetailAfterLeave() {
  if (showDetail.value) {
    detailMounted.value = false;
    await nextTick();
    detailMounted.value = true;
  } else {
    detailMounted.value = false;
  }
}

const thumbUrl = computed(() => {
  if (props.loadImage === false) return undefined;
  const first = props.list.images[0];
  if (!first) return undefined;
  return compactThumb(getImageUrl(first));
});

const orgLogoUrl = computed(() => {
  if (!props.list.organization.logoUrl) return null;
  return getImageUrl(props.list.organization.logoUrl);
});

const positionLabel = computed(() =>
  props.list.bestPosition != null ? `#${props.list.bestPosition}` : t("waitingLists.card.noPosition"),
);

async function handleReactivate(e: MouseEvent) {
  e.stopPropagation();
  await store.setActive(props.list.propertyId);
}
</script>

<template>
  <li>
    <div
      class="flex gap-3 p-2 rounded-xl
             bg-white/80 dark:bg-white/[0.06]
             hover:bg-white dark:hover:bg-white/[0.10]
             border border-transparent dark:border-white/[0.04] hover:border-neutral-200/50 dark:hover:border-white/[0.08]
             cursor-pointer transition-all duration-150
             active:scale-[0.99] select-none"
      @click="openDetail"
    >
      <!-- Thumbnail -->
      <div class="relative w-24 md:w-32 shrink-0 aspect-[3/2] rounded-lg overflow-hidden bg-neutral-200 dark:bg-white/10">
        <img
          v-if="thumbUrl"
          :src="thumbUrl"
          :alt="list.name"
          class="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <span
          class="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[0.625rem] font-semibold rounded-md"
          :class="list.status === 'Active'
            ? 'bg-emerald-500 text-white'
            : 'bg-amber-500 text-white'"
        >
          {{ list.status === "Active" ? t("waitingLists.card.statusActive") : t("waitingLists.card.statusPassive") }}
        </span>
      </div>

      <!-- Text content -->
      <div class="flex flex-col justify-between min-w-0 flex-1 py-0.5">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <p class="font-semibold text-[0.8125rem] leading-snug truncate dark:text-neutral-100">
              {{ list.name }}
            </p>
            <img
              v-if="orgLogoUrl"
              :src="orgLogoUrl"
              :alt="list.organization.name"
              class="shrink-0 h-3 w-auto opacity-70"
              :title="list.organization.name"
            />
            <span
              v-else
              class="shrink-0 px-1 text-[0.625rem] font-medium rounded bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
            >
              {{ list.organization.name }}
            </span>
          </div>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {{ list.address }}
          </p>
        </div>

        <div class="flex items-end justify-between gap-2 mt-auto">
          <div class="min-w-0">
            <p class="text-[0.625rem] font-medium text-neutral-500 dark:text-neutral-400">
              {{ t("waitingLists.card.residencesApplied", { count: list.residencesAppliedCount }, list.residencesAppliedCount) }}
            </p>
            <p class="text-[0.8125rem] font-medium tabular-nums dark:text-neutral-200">
              {{ formatCurrency(list.minRent) }}–{{ formatCurrency(list.maxRent) }}
            </p>
          </div>

          <div class="text-right shrink-0">
            <p class="text-[0.625rem] font-medium text-neutral-500 dark:text-neutral-400 leading-tight">
              {{ t("waitingLists.card.bestPosition") }}
            </p>
            <p
              class="text-base font-bold tabular-nums leading-tight"
              :class="list.bestPosition != null ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-300 dark:text-neutral-600'"
            >
              {{ positionLabel }}
            </p>
          </div>
        </div>

        <button
          v-if="list.status === 'Passive'"
          class="mt-1.5 w-full py-1.5 px-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-60"
          :disabled="store.isMutating"
          @click="handleReactivate"
        >
          {{ t("waitingLists.card.reactivate") }}
        </button>
      </div>
    </div>

    <WaitingListDetailSheet
      v-if="detailMounted"
      :list="list"
      @close="onDetailClose"
      @after-leave="onDetailAfterLeave"
    />
  </li>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/waitingList/card/WaitingListCard.vue client/src/components/waitingList/detail/WaitingListDetailSheet.vue
git commit -m "feat(waiting-lists): add WaitingListCard with detail sheet stub"
```

The stub keeps `vue-tsc` green during Chunks 3 and 4. Task 17 replaces it with the real implementation.

---

### Task 15: Create `WaitingListGroup.vue`

**Files:**
- Create: `client/src/components/waitingList/WaitingListGroup.vue`

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import type { WaitingList } from "@/types";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import BaseCollapse from "~/components/Base/BaseCollapse.vue";
import { useWaitingListsStore } from "~/stores/waitingLists";
import WaitingListCard from "./card/WaitingListCard.vue";

const { t } = useI18n();
const store = useWaitingListsStore();

const props = defineProps<{
  groupKey: "passive" | "active";
  label: string;
  lists: WaitingList[];
  isFirst?: boolean;
  class?: string;
}>();

const expanded = ref(props.isFirst ?? false);
const hasBeenExpanded = ref(expanded.value);

watch(expanded, (val) => {
  if (val) hasBeenExpanded.value = true;
});

function toggleExpanded() {
  expanded.value = !expanded.value;
}

async function onReactivateAll(e: MouseEvent) {
  e.stopPropagation();
  await store.reactivateAll();
}
</script>

<template>
  <li :class="props.class">
    <!-- Group header -->
    <div class="flex items-center justify-between cursor-pointer" @click="toggleExpanded">
      <div class="flex items-center gap-2">
        <h2 class="text-[clamp(0.95rem,3vw,1.125rem)] font-semibold pl-1">{{ label }}</h2>
        <span
          v-if="!expanded"
          class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full dark:bg-white/15 bg-neutral-400/30 dark:text-neutral-300 text-neutral-600"
        >
          {{ props.lists.length }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="groupKey === 'passive' && lists.length > 1"
          class="px-2.5 py-1 rounded-md text-xs font-semibold
                 bg-amber-500 hover:bg-amber-600 text-white
                 disabled:opacity-60 transition-colors"
          :disabled="store.isMutating"
          @click="onReactivateAll"
        >
          <template v-if="store.bulkInProgress">
            {{ t("waitingLists.actions.reactivating", { done: store.bulkDone, total: store.bulkTotal }) }}
          </template>
          <template v-else>
            {{ t("waitingLists.actions.reactivateAll") }}
          </template>
        </button>
        <img
          src="/icons/chevron-down.svg"
          alt="Expand/Collapse"
          class="size-5 dark:invert opacity-70 transition-transform duration-200"
          :class="{ '-rotate-90': !expanded }"
        />
      </div>
    </div>

    <!-- Inner loop -->
    <BaseCollapse v-model:expanded="expanded">
      <hr class="dark:border-zinc-50/25 m-1" />
      <ul class="grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1">
        <WaitingListCard
          v-for="list in props.lists"
          :key="list.propertyId"
          :list="list"
          :load-image="hasBeenExpanded"
        />
      </ul>
    </BaseCollapse>
  </li>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/waitingList/WaitingListGroup.vue
git commit -m "feat(waiting-lists): add WaitingListGroup with bulk reactivate button"
```

---

### Task 16: Create `WaitingListsList.vue` and `ConfirmUnsubscribeDialog.vue`

**Files:**
- Create: `client/src/components/waitingList/WaitingListsList.vue`
- Create: `client/src/components/waitingList/detail/ConfirmUnsubscribeDialog.vue`

- [ ] **Step 1: Create `WaitingListsList.vue`**

```vue
<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import CompactCardSkeleton from "~/components/appointment/card/CompactCardSkeleton.vue";
import { useGroupWaitingLists } from "~/composables/useGroupWaitingLists";
import { useWaitingListsStore } from "~/stores/waitingLists";
import WaitingListGroup from "./WaitingListGroup.vue";

const { t } = useI18n();
const store = useWaitingListsStore();
const { lists, isLoading } = storeToRefs(store);
const { grouped } = useGroupWaitingLists(lists, t);
</script>

<template>
  <div>
    <!-- Skeleton loading -->
    <div
      v-if="isLoading && !lists.length"
      class="w-full border rounded-xl p-2 dark:border-zinc-50/25 dark:bg-white/5 bg-neutral-200"
    >
      <div class="h-5 w-28 rounded-md mb-2 ml-1 bg-neutral-300/40 dark:bg-white/10" />
      <ul class="grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1">
        <CompactCardSkeleton v-for="i in 4" :key="i" />
      </ul>
    </div>

    <!-- Loaded -->
    <ul v-else class="w-full space-y-2">
      <WaitingListGroup
        v-for="group in grouped"
        :key="group.key"
        class="w-full border rounded-xl p-1 dark:border-zinc-50/25 dark:bg-white/5 bg-neutral-200"
        :group-key="group.key"
        :label="group.label"
        :lists="group.lists"
        :is-first="group.isFirst"
      />
    </ul>

    <!-- Empty -->
    <div v-if="!isLoading && !lists.length" class="text-center py-12">
      <p class="text-lg font-semibold dark:text-white">{{ t("waitingLists.emptyTitle") }}</p>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-sm mx-auto">
        {{ t("waitingLists.emptyDescription") }}
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create `ConfirmUnsubscribeDialog.vue`**

```bash
mkdir -p client/src/components/waitingList/detail
```

Create `client/src/components/waitingList/detail/ConfirmUnsubscribeDialog.vue`:

```vue
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useScrollLock } from "~/composables/useScrollLock";

const { t } = useI18n();
useScrollLock();

defineProps<{
  name: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="emit('cancel')"
      />

      <!-- Dialog -->
      <div
        class="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div class="p-6 text-center">
          <div class="text-3xl mb-3">&#x26A0;</div>
          <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
            {{ t("waitingLists.confirm.unsubscribeTitle", { name }) }}
          </h3>
          <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {{ t("waitingLists.confirm.unsubscribeBody") }}
          </p>

          <!-- Actions -->
          <div class="flex gap-3 mt-5">
            <button
              class="flex-1 py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700/50
                     text-neutral-600 dark:text-neutral-400 font-medium
                     hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
              :disabled="isLoading"
              @click="emit('cancel')"
            >
              {{ t("waitingLists.confirm.cancel") }}
            </button>
            <button
              class="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              :disabled="isLoading"
              @click="emit('confirm')"
            >
              <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span v-else>{{ t("waitingLists.confirm.confirm") }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/waitingList/WaitingListsList.vue client/src/components/waitingList/detail/ConfirmUnsubscribeDialog.vue
git commit -m "feat(waiting-lists): add list container and unsubscribe confirmation dialog"
```

---

## Chunk 4: Detail sheet, page, route, nav, smoke test

### Task 17: Create `WaitingListDetailSheet.vue`

**Files:**
- Create: `client/src/components/waitingList/detail/WaitingListDetailSheet.vue`

- [ ] **Step 1: Create the file**

This component mirrors the existing `client/src/components/offer/detail/OfferDetailSheet.vue` structure (drag-to-dismiss, history API integration, gallery, etc.) but adapted to the waiting-list domain. Reference that file for the boilerplate shape; the diff below is the content-specific part.

```vue
<script setup lang="ts">
import type { WaitingList } from "@/types";
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useScrollLock } from "~/composables/useScrollLock";
import { formatCurrency } from "~/lib/formatters";
import { galleryImage } from "~/lib/imageTransform";
import { useWaitingListsStore } from "~/stores/waitingLists";
import ImageGalleryModal from "~/components/appointment/gallery/ImageGalleryModal.vue";
import ConfirmUnsubscribeDialog from "./ConfirmUnsubscribeDialog.vue";

const { t } = useI18n();
useScrollLock();
const store = useWaitingListsStore();
const { getImageUrl } = store;

const props = defineProps<{
  list: WaitingList;
}>();

const emit = defineEmits<{
  close: [];
  "after-leave": [];
}>();

const visible = ref(false);
const showGallery = ref(false);
const showConfirmUnsubscribe = ref(false);
const galleryActiveIndex = ref(0);
const sheetEl = ref<HTMLElement | null>(null);

// Drag-to-dismiss
const dragY = ref(0);
const isDragging = ref(false);
let dragStartY = 0;
let lastPointerId = 0;
const DISMISS_THRESHOLD = 120;

const sheetStyle = computed(() => {
  if (isDragging.value && dragY.value > 0) {
    return { transform: `translateY(${dragY.value}px)`, transition: "none" };
  }
  return undefined;
});

const backdropOpacity = computed(() => {
  if (isDragging.value && dragY.value > 0) {
    return Math.max(0, 1 - dragY.value / 400);
  }
  return undefined;
});

function onDragStart(e: PointerEvent) {
  isDragging.value = true;
  dragStartY = e.clientY;
  dragY.value = 0;
  lastPointerId = e.pointerId;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onDragMove(e: PointerEvent) {
  if (!isDragging.value) return;
  const delta = e.clientY - dragStartY;
  dragY.value = Math.max(0, delta);
}

function onDragEnd(e: PointerEvent) {
  if (!isDragging.value) return;
  isDragging.value = false;
  (e.currentTarget as HTMLElement).releasePointerCapture(lastPointerId);
  if (dragY.value > DISMISS_THRESHOLD) {
    close();
  } else {
    dragY.value = 0;
  }
}

const allImages = computed(() => props.list.images ?? []);

const appliedSinceFormatted = computed(() => {
  if (!props.list.appliedSince) return null;
  return new Date(props.list.appliedSince).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

const orgLogoUrl = computed(() =>
  props.list.organization.logoUrl ? getImageUrl(props.list.organization.logoUrl) : null,
);

// Gallery click vs swipe
let galleryStartX = 0;
let galleryStartY = 0;

function onGalleryPointerDown(e: PointerEvent) {
  galleryStartX = e.clientX;
  galleryStartY = e.clientY;
}

function openGallery(e: MouseEvent) {
  if (Math.abs(e.clientX - galleryStartX) > 5 || Math.abs(e.clientY - galleryStartY) > 5) return;
  showGallery.value = true;
  history.pushState({ sheet: true, gallery: true }, "");
}

function onGalleryClose() {
  showGallery.value = false;
  history.back();
}

function handleMapClick() {
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.list.address)}`,
    "_blank",
  );
}

function openOnFindbolig() {
  window.open(
    `https://findbolig.nu/property/${props.list.propertyShortId}`,
    "_blank",
  );
}

async function handleReactivate() {
  await store.setActive(props.list.propertyId);
}

async function handleConfirmUnsubscribe() {
  const ok = await store.unsubscribe(props.list.propertyId);
  if (ok) {
    showConfirmUnsubscribe.value = false;
    close();
  }
}

let closedViaPopState = false;

function close() {
  if (!visible.value) return;
  visible.value = false;

  if (!closedViaPopState) {
    window.removeEventListener("popstate", onPopState);
    history.back();
  }

  emit("close");

  let fired = false;
  const emitAfterLeave = () => {
    if (!fired) {
      fired = true;
      emit("after-leave");
    }
  };
  sheetEl.value?.addEventListener("transitionend", emitAfterLeave, { once: true });
  setTimeout(emitAfterLeave, 350);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && !showGallery.value && !showConfirmUnsubscribe.value) close();
}

function onPopState(event: PopStateEvent) {
  if (showGallery.value) { showGallery.value = false; return; }
  if (event.state?.sheet) return;
  closedViaPopState = true;
  close();
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("popstate", onPopState);
  history.pushState({ sheet: true }, "");
  requestAnimationFrame(() => { visible.value = true; });
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("popstate", onPopState);
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end justify-center" :class="{ 'pointer-events-none': !visible }">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        :class="visible ? 'opacity-100' : 'opacity-0'"
        :style="backdropOpacity != null ? { opacity: backdropOpacity } : undefined"
        @click="close"
      />

      <!-- Sheet -->
      <div
        ref="sheetEl"
        role="dialog"
        aria-modal="true"
        class="sheet-panel relative w-full max-w-2xl max-h-[92vh]
               bg-white dark:bg-neutral-900
               rounded-t-2xl overflow-hidden
               flex flex-col shadow-2xl
               transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        :class="visible ? 'translate-y-0' : 'translate-y-full'"
        :style="sheetStyle"
      >
        <!-- Drag handle -->
        <div
          class="flex justify-center pt-3 pb-3 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
          @pointerdown="onDragStart"
          @pointermove="onDragMove"
          @pointerup="onDragEnd"
          @pointercancel="onDragEnd"
        >
          <div class="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>

        <!-- Close button -->
        <button
          class="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
          aria-label="Close"
          @click="close"
        >
          <img src="/icons/x.svg" alt="" class="size-4 invert" />
        </button>

        <!-- Scrollable content -->
        <div class="overflow-y-auto overscroll-contain flex-1">
          <!-- Image gallery -->
          <div
            v-if="allImages.length > 0"
            class="relative cursor-pointer"
            @pointerdown="onGalleryPointerDown"
            @click="openGallery"
          >
            <Swiper
              :modules="[Navigation, Pagination]"
              :slides-per-view="1"
              :space-between="0"
              :pagination="{ clickable: true, dynamicBullets: true }"
              :navigation="allImages.length > 1"
              class="detail-swiper"
              @slide-change="(s: any) => galleryActiveIndex = s.activeIndex"
            >
              <SwiperSlide v-for="(img, i) in allImages" :key="img">
                <img
                  :src="galleryImage(getImageUrl(img))"
                  :alt="`Photo ${i + 1}`"
                  class="w-full aspect-[16/10] object-cover"
                  :loading="i > 0 ? 'lazy' : 'eager'"
                />
              </SwiperSlide>
            </Swiper>

            <div
              v-if="allImages.length > 1"
              class="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs tabular-nums pointer-events-none"
            >
              {{ allImages.length }}
            </div>
          </div>

          <!-- Content -->
          <div class="p-5 space-y-5">
            <!-- Header -->
            <div>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <h2 class="text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                    {{ list.name }}
                  </h2>
                  <button class="flex items-center gap-1.5 mt-1.5 group" @click="handleMapClick">
                    <p class="text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                      {{ list.address }}
                    </p>
                    <img src="/icons/map.svg" alt="" class="size-4 opacity-40 group-hover:opacity-70 transition-opacity dark:invert" />
                  </button>
                </div>
                <div v-if="orgLogoUrl" class="shrink-0">
                  <img :src="orgLogoUrl" :alt="list.organization.name" class="h-6 w-auto opacity-90" />
                </div>
              </div>
              <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                {{ list.organization.name }} · {{ list.company.name }}
              </p>
            </div>

            <hr class="border-neutral-200 dark:border-neutral-700/50" />

            <!-- Stats grid -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                  {{ t("waitingLists.card.bestPosition") }}
                </p>
                <p
                  class="text-2xl font-bold tabular-nums"
                  :class="list.bestPosition != null ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-300 dark:text-neutral-600'"
                >
                  {{ list.bestPosition != null ? `#${list.bestPosition}` : t("waitingLists.card.noPosition") }}
                </p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                  {{ t("waitingLists.card.residencesApplied", { count: list.residencesAppliedCount }, list.residencesAppliedCount) }}
                </p>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                  {{ t("waitingLists.detail.rooms", { min: list.minRooms, max: list.maxRooms }) }}
                  · {{ t("waitingLists.detail.area", { min: list.minArea, max: list.maxArea }) }}
                </p>
              </div>
            </div>

            <!-- Rent -->
            <div class="p-3 rounded-xl bg-neutral-100 dark:bg-white/5">
              <p class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-0.5">
                {{ t("waitingLists.detail.rent") }}
              </p>
              <p class="text-sm font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {{ t("waitingLists.card.rentRange", { min: formatCurrency(list.minRent), max: formatCurrency(list.maxRent) }) }}
              </p>
            </div>

            <!-- Applied since -->
            <div v-if="appliedSinceFormatted">
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ t("waitingLists.detail.appliedSince", { date: appliedSinceFormatted }) }}
              </p>
            </div>

            <hr class="border-neutral-200 dark:border-neutral-700/50" />

            <!-- Action area -->
            <div>
              <button
                v-if="list.status === 'Passive'"
                class="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-60"
                :disabled="store.isMutating"
                @click="handleReactivate"
              >
                {{ t("waitingLists.card.reactivate") }}
              </button>
              <div
                v-else
                class="w-full py-3.5 rounded-xl bg-emerald-500/10 text-center"
              >
                <span class="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  &#x2713; {{ t("waitingLists.card.statusActive") }}
                </span>
              </div>
            </div>

            <!-- Open on findbolig -->
            <button
              class="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/50 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
              @click="openOnFindbolig"
            >
              <img src="/icons/external-link.svg" alt="" class="size-4 opacity-50 dark:invert" />
              <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {{ t("waitingLists.detail.openOnFindbolig") }}
              </span>
            </button>

            <hr class="border-neutral-200 dark:border-neutral-700/50" />

            <!-- Danger zone -->
            <div>
              <p class="text-xs font-medium uppercase tracking-wider text-red-500/70 mb-2">
                {{ t("waitingLists.detail.dangerZone") }}
              </p>
              <button
                class="w-full py-3 px-4 rounded-xl border border-red-300/50 dark:border-red-500/30
                       text-red-600 dark:text-red-400 font-medium
                       hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                :disabled="store.isMutating"
                @click="showConfirmUnsubscribe = true"
              >
                {{ t("waitingLists.detail.unsubscribe") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gallery modal -->
    <ImageGalleryModal
      v-if="showGallery"
      :images="allImages"
      :blueprints="list.blueprints ?? []"
      :initial-index="galleryActiveIndex"
      :get-image-url="getImageUrl"
      @close="onGalleryClose"
    />

    <!-- Confirm unsubscribe -->
    <ConfirmUnsubscribeDialog
      v-if="showConfirmUnsubscribe"
      :name="list.name"
      :is-loading="store.isMutating"
      @confirm="handleConfirmUnsubscribe"
      @cancel="showConfirmUnsubscribe = false"
    />
  </Teleport>
</template>

<style scoped>
.detail-swiper :deep(.swiper-pagination-bullet) { background: white; opacity: 0.5; }
.detail-swiper :deep(.swiper-pagination-bullet-active) { opacity: 1; }
.detail-swiper :deep(.swiper-button-next),
.detail-swiper :deep(.swiper-button-prev) {
  color: rgba(255, 255, 255, 0.7);
  --swiper-navigation-size: 18px;
}
.detail-swiper :deep(.swiper-button-next:hover),
.detail-swiper :deep(.swiper-button-prev:hover) { color: white; }
@media (max-width: 639px) {
  .detail-swiper :deep(.swiper-button-next),
  .detail-swiper :deep(.swiper-button-prev) { display: none; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/waitingList/detail/WaitingListDetailSheet.vue
git commit -m "feat(waiting-lists): add WaitingListDetailSheet with unsubscribe action"
```

---

### Task 18: Create `WaitingListsView.vue` and add route

**Files:**
- Create: `client/src/views/WaitingListsView.vue`
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: Create the view**

```vue
<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import PassivatedBanner from "~/components/waitingList/PassivatedBanner.vue";
import WaitingListsList from "~/components/waitingList/WaitingListsList.vue";
import { useAuth } from "~/composables/useAuth";
import { getWaitingListsCacheAge } from "~/data/waitingLists";
import { useWaitingListsStore } from "~/stores/waitingLists";

const store = useWaitingListsStore();
const auth = useAuth();
const router = useRouter();
const { t } = useI18n();

const count = computed(() => store.lists.length);

onMounted(() => {
  const hasCache = getWaitingListsCacheAge() !== null;
  if (!auth.isAuthenticated && !hasCache && !auth.isDemo) {
    router.replace("/");
    return;
  }
  store.init();
});
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <p class="text-xl font-semibold tracking-tight dark:text-white flex items-baseline gap-2">
        {{ t("waitingLists.pageTitle") }}
        <span v-if="count > 0" class="text-xs font-normal text-neutral-400 dark:text-neutral-500">
          {{ t("waitingLists.count", { count }, count) }}
        </span>
      </p>
      <button
        @click="store.handleRefresh()"
        :disabled="store.isLoading"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
               text-neutral-500 dark:text-neutral-400
               hover:bg-neutral-100 dark:hover:bg-white/5
               disabled:opacity-40 transition-colors"
      >
        <img
          src="/icons/refresh-ccw.svg"
          alt=""
          class="size-4 dark:invert opacity-60"
          :class="{ 'animate-spin': store.isLoading }"
        />
        {{ t("waitingLists.refresh") }}
      </button>
    </div>

    <PassivatedBanner />
    <WaitingListsList />
  </div>
</template>
```

- [ ] **Step 2: Add the route**

In `client/src/router/index.ts`, add to the `routes` array (after the existing `/offers` entry):

```typescript
{
  path: "/waiting-lists",
  name: "waiting-lists",
  component: () => import("~/views/WaitingListsView.vue"),
},
```

- [ ] **Step 3: Commit**

```bash
git add client/src/views/WaitingListsView.vue client/src/router/index.ts
git commit -m "feat(waiting-lists): add view and route"
```

---

### Task 19: Add bottom-nav entry

**Files:**
- Modify: `client/src/components/BottomNav.vue`

- [ ] **Step 1: Add a list icon**

`client/public/icons/` doesn't contain a list/queue icon yet. Existing icons (e.g. `calendar-days.svg`, `cloud-download.svg`) are Lucide-style. Add a Lucide list icon at `client/public/icons/list.svg` with this content:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
```

Verify:

```bash
ls client/public/icons/list.svg
```

- [ ] **Step 2: Add the nav item**

In `client/src/components/BottomNav.vue`, modify the `navItems` array:

```typescript
const navItems = [
  { to: "/", icon: "/icons/home.svg", labelKey: "nav.home", exact: true },
  { to: "/appointments", icon: "/icons/calendar-days.svg", labelKey: "nav.appointments" },
  { to: "/offers", icon: "/icons/cloud-download.svg", labelKey: "nav.offers" },
  { to: "/waiting-lists", icon: "/icons/list.svg", labelKey: "nav.waitingLists" },
];
```

- [ ] **Step 3: Add the badge for `recentlyPassivated`**

In the same file, import the store inside `<script setup>`:

```typescript
import { storeToRefs } from "pinia";
import { useWaitingListsStore } from "~/stores/waitingLists";

const waitingListsStore = useWaitingListsStore();
const { recentlyPassivated } = storeToRefs(waitingListsStore);
```

In the template, **wrap the existing `<img>` inside each `<button>` with a `<div class="relative">`**, and put the badge `<span>` inside that div — gated by `v-if` on the waiting-lists item so it only renders for that nav button. Apply the wrapper to every button (so layout stays consistent across all four nav entries); the badge itself is per-item.

The relevant section of the template becomes (the `<img>` is the existing one — do not duplicate it):

```vue
<div class="relative">
  <img
    :src="item.icon"
    :alt="t(item.labelKey)"
    class="size-5 transition-opacity"
    :class="(item.exact ? isExactActive : isActive)
      ? 'opacity-100 dark:invert-0'
      : 'opacity-50 dark:invert'"
    :style="(item.exact ? isExactActive : isActive)
      ? { filter: 'invert(37%) sepia(74%) saturate(1500%) hue-rotate(200deg) brightness(97%) contrast(97%)' }
      : undefined"
  />
  <span
    v-if="item.to === '/waiting-lists' && recentlyPassivated.length > 0"
    class="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 text-[0.625rem] font-bold rounded-full bg-red-500 text-white"
  >
    {{ recentlyPassivated.length }}
  </span>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/BottomNav.vue
git commit -m "feat(waiting-lists): add Ventelister bottom-nav entry with badge"
```

---

### Task 20: Verify the build

**Files:** none (verification only)

- [ ] **Step 1: Run client typecheck and build**

```bash
cd client && npx vue-tsc --noEmit
```

Expected: no errors.

Then:

```bash
cd client && npm run build
```

Expected: build succeeds. If `vue-tsc` reports errors:
- Missing prop names? Cross-check the spec types against the component usage.
- Incompatible i18n key? Confirm the key exists in both `da.json` and `en.json`.
- `useAuth` shape? Cross-check against the equivalent usage in `OffersView.vue` (the imports must match).

- [ ] **Step 2: Run server typecheck**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit any fixes**

If you had to fix issues, commit them:

```bash
git commit -am "fix(waiting-lists): typecheck issues from build verification"
```

---

### Task 21: Manual smoke test in demo mode

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open the app in a browser and enable demo mode**

Click "Demo login" on the landing page.

- [ ] **Step 3: Navigate to `/waiting-lists`**

Verify:
- Page header shows "Ventelister" and a count badge
- `PassivatedBanner` is visible at the top with 2 affected names (the two Passive fixtures)
- "Passive" group is expanded showing 2 cards (Vodroffsvej 16, Vigerslevvej 41-57C)
- "Active" group is collapsed; click to expand and confirm 2 cards (Hasselgården, Enighedsvej)
- Each card has thumbnail, name, address, status pill, position info, residences-applied count, and rent range
- The Passive cards have an inline "Meld mig aktiv" button
- Bottom nav has a 4th entry "Ventelister" with a red "2" badge

- [ ] **Step 4: Test single reactivate**

Click "Meld mig aktiv" on one Passive card. Expected:
- Card immediately shows Active status
- Card moves to the Active group on next render
- Toast: "Vodroffsvej 16 er nu aktiv" (or similar)
- Banner now shows 1 affected name

- [ ] **Step 5: Test bulk reactivate**

Refresh the page to reset demo state. Click "Aktivér alle" on either the banner or the Passive group header. Expected:
- Button text changes to "Aktiverer X af 2…" while running
- Both Passive cards become Active
- Toast: "2 ventelister aktiveret"
- Banner disappears

- [ ] **Step 6: Test detail sheet**

Refresh, click a card. Expected:
- Drag-up bottom sheet opens with image gallery, address (map link), org logo, position, residences, rent range, and applied-since date
- "Åbn på findbolig.nu" opens an external tab to `https://findbolig.nu/property/<shortId>`
- "Fjern mig fra ventelisten" opens the confirm dialog
- Drag-to-dismiss works
- Browser back button closes the sheet

- [ ] **Step 7: Test unsubscribe flow**

In the detail sheet, click "Fjern mig fra ventelisten" → "Fjern mig". Expected:
- Toast: "Du er fjernet fra <name>"
- Card disappears from the list
- Detail sheet closes

- [ ] **Step 8: Test dark mode**

Toggle dark mode and re-verify card styling, banner, sheet, and dialog all render correctly.

- [ ] **Step 9: Test empty state**

In demo mode, unsubscribe from all 4 mock lists. Expected:
- "Du er ikke skrevet op til nogen ventelister" empty state appears

- [ ] **Step 10: Commit any fixes from smoke test**

```bash
git commit -am "fix(waiting-lists): smoke test adjustments"
```

(Only if any issues were found.)

---

### Task 22: Manual integration test against real findbolig.nu

**Files:** none (verification only)

- [ ] **Step 1: Log in with real findbolig.nu credentials**

Use the dev environment, log in with your real account.

- [ ] **Step 2: Open `/waiting-lists` and inspect**

Expected:
- All your real waiting lists appear (one card per property you've applied to)
- Status pills accurately reflect Active/Passive — cross-check against findbolig.nu/profile/my-waiting-lists
- Best positions populate where the upstream returns them; show "—" where it doesn't
- Org logos appear

- [ ] **Step 3: Verify the position-for-property response shape**

Open the browser devtools Network tab while the page loads. Find a `position-for-property/<id>` request. Inspect the response. Confirm the shape that `extractBestPosition` handles (number | array | object with `position` field). If the actual shape is something else, update `extractBestPosition` to handle it and re-test.

- [ ] **Step 4: Test reactivation against the real API**

Pick a Passive list. Click "Meld mig aktiv". Verify:
- Toast says success
- After refresh, the list shows as Active both in fetchBolig and on findbolig.nu

If a known-quarantined org refuses set-active, verify the error toast surfaces correctly.

- [ ] **Step 5: Simulate a status flip to test the banner**

Load the page first so snapshots are written. Then in browser devtools console, edit the snapshots — pick a propertyId you know is currently Passive on the server:

```js
const snaps = JSON.parse(localStorage.getItem("waiting_lists_snapshots"));
const target = snaps.find((s) => s.propertyId === "<some-passive-propertyId>");
if (!target) throw new Error("Snapshot not found — load /waiting-lists once first.");
target.status = "Active";
localStorage.setItem("waiting_lists_snapshots", JSON.stringify(snaps));
```

Click Refresh on the page. Expected: PassivatedBanner appears, naming that property. Click "Aktivér alle" or "Meld mig aktiv" to verify the round-trip.

- [ ] **Step 6: Test unsubscribe against the real API (optional — destructive!)**

Only run this on a waiting list you genuinely no longer want (you lose seniority). Verify:
- Confirm dialog appears
- After confirm, the row disappears
- On findbolig.nu, the property is no longer in your waiting lists

- [ ] **Step 7: Final commit (if any tweaks were made)**

```bash
git commit -am "fix(waiting-lists): integration test adjustments"
```

---

## Done

The feature should now be:

- Live at `/waiting-lists` in the dev build
- Wired into the bottom nav with a `recentlyPassivated` badge
- Functioning end-to-end against findbolig.nu: view, single reactivate, bulk reactivate, unsubscribe, transition alerts
- Demo-mode-friendly via `MOCK_WAITING_LISTS.json`
- i18n-complete in both Danish and English

If `vue-tsc` and the manual smoke / integration tests pass, the implementation is complete.

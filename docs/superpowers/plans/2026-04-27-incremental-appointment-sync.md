# Incremental Appointment Sync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Sync data" flow faster by having the client send its cached appointments to the server, so the server can skip expensive LLM/API calls for past and unchanged appointments.

**Architecture:** New `POST /api/appointments/sync` endpoint accepts cached appointment metadata from the client. Server categorizes each offer into one of three paths (past → echo cached, unchanged thread → skip LLM, new/changed → full processing). Response shape stays `Appointment[]`.

**Tech Stack:** TypeScript, Hono (server), Vue/Pinia (client), OpenAI API, shared types between client/server.

**Spec:** `docs/superpowers/specs/2026-04-27-incremental-appointment-sync-design.md`

**Note:** This project has no test infrastructure. Tasks focus on implementation with manual verification.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `shared/types.ts` | Modify | Add `messageCount` to `Appointment`, add `CachedAppointmentEntry` and `SyncAppointmentsRequest` types |
| `server/src/lib/findbolig-domain.ts` | Modify | Accept `messageCount` in `mapAppointmentToDomain` |
| `server/src/findbolig-service.ts` | Modify | Add 3-path logic to `getUpcomingAppointments`, pass `messageCount` through |
| `server/src/index.ts` | Modify | Add `POST /api/appointments/sync` endpoint |
| `client/src/data/appointmentsSource.ts` | Modify | Add `syncAppointments()` function |
| `client/src/data/appointments.ts` | Modify | Build `CachedAppointmentEntry[]` from localStorage, call `syncAppointments` |
| `client/src/lib/serialization.ts` | Modify | Default `messageCount` to 0 for old cache entries |

---

## Chunk 1: Shared Types & Server Domain Mapping

### Task 1: Add shared types

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: Add `messageCount` to `Appointment` type**

In `shared/types.ts`, add `messageCount` as an optional field to the `Appointment` type, after the `declined` field (line 17):

```ts
  declined: string | null;
  messageCount?: number;
};
```

- [ ] **Step 2: Add `CachedAppointmentEntry` and `SyncAppointmentsRequest` types**

Add these after the existing `Offer` type at the end of `shared/types.ts`:

```ts
export type CachedAppointmentEntry = {
  offerId: string;
  messageCount: number;
  date: string | null;
  appointment: Appointment;
};

export type SyncAppointmentsRequest = {
  cached: CachedAppointmentEntry[];
  includeAll: boolean;
};
```

- [ ] **Step 3: Commit**

```bash
git add shared/types.ts
git commit -m "feat: add messageCount and sync request types to shared types"
```

---

### Task 2: Update `mapAppointmentToDomain` to include `messageCount`

**Files:**
- Modify: `server/src/lib/findbolig-domain.ts:6-47`

- [ ] **Step 1: Add `messageCount` to the function parameter and return value**

Update the function signature to accept `messageCount` and include it in the returned object. In `server/src/lib/findbolig-domain.ts`, change the function:

```ts
export function mapAppointmentToDomain({
  offer,
  residence,
  details,
  position,
  messageCount,
}: {
  offer: ApiOffer;
  residence: Residence;
  details: AppointmentDetails;
  position: number | null;
  messageCount: number;
}): Appointment {
  const recipient = offer.recipients?.[0];
  return {
    id: `DEAS-O-${offer.id}`,
    offerId: offer.id,
    title: residence.title,
    date: details.date || null,
    start: details.startTime || null,
    end: details.endTime || null,
    cancelled: details.cancelled,
    residence: {
      adressLine1: residence.addressLine1,
      adressLine2: residence.addressLine2,
      location: residence.location,
    },
    financials: {
      monthlyRentIncludingAconto: residence.monthlyRentIncludingAconto,
      monthlyRentExcludingAconto: residence.monthlyRentExcludingAconto,
      utilityCosts: residence.aconto,
      deposit: residence.deposit,
      prepaidRent: residence.prepaidRent,
      firstPayment: residence.firstPayment,
    },
    imageUrl: residence.images[0] || "",
    images: residence.images,
    blueprints: residence.blueprints,
    position,
    recipientState: recipient?.state ?? null,
    accepted: recipient?.accepted ?? null,
    declined: recipient?.declined ?? null,
    messageCount,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/findbolig-domain.ts
git commit -m "feat: include messageCount in mapAppointmentToDomain"
```

---

## Chunk 2: Server-Side Incremental Sync Logic

### Task 3: Update `getUpcomingAppointments` with 3-path logic

**Files:**
- Modify: `server/src/findbolig-service.ts:244-305`

- [ ] **Step 1: Import `CachedAppointmentEntry` type**

Add to the imports at the top of `server/src/findbolig-service.ts`:

```ts
import type { CachedAppointmentEntry } from "@/types";
```

- [ ] **Step 2: Add `isDateInPast` helper**

Add this helper function above `getUpcomingAppointments`:

```ts
function isDateInPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr < today;
}
```

- [ ] **Step 3: Rewrite `getUpcomingAppointments` to accept and use cached data**

Replace the existing `getUpcomingAppointments` function with:

```ts
export async function getUpcomingAppointments(
  cookies: string,
  includeAll: boolean = false,
  cached?: CachedAppointmentEntry[],
) {
  try {
    let offers = (await fetchOffers(cookies)).results;

    if (!includeAll) {
      offers = offers.filter(
        (offer) => offer.state === "Finished" || offer.state === "Published",
      );
    }

    const cacheMap = new Map(
      (cached ?? []).map((entry) => [entry.offerId, entry]),
    );

    const currentYear = new Date().getFullYear().toString();

    const results = await Promise.all(
      offers.map(async (offer) => {
        if (!offer.residenceId || !offer.id) {
          return null;
        }

        const cachedEntry = cacheMap.get(offer.id);

        // Path 1: Past appointment with cached data — echo back as-is
        if (cachedEntry && isDateInPast(cachedEntry.date)) {
          return cachedEntry.appointment;
        }

        // Fetch thread (needed for Path 2 comparison and Path 3 extraction)
        const [residence, thread, position] = await Promise.all([
          getResidence(offer.residenceId, cookies),
          getThreadForOffer(offer.id, cookies),
          getPositionOnOffer(offer.id, cookies).catch(() => null),
        ]);

        if (!thread) {
          return null;
        }

        // Path 2: Unchanged thread — skip LLM, reuse cached details
        if (
          cachedEntry &&
          thread.messages.length === cachedEntry.messageCount
        ) {
          const details = {
            date: cachedEntry.appointment.date ?? "",
            startTime: cachedEntry.appointment.start ?? "",
            endTime: cachedEntry.appointment.end ?? "",
            cancelled: cachedEntry.appointment.cancelled,
          };
          return mapAppointmentToDomain({
            offer,
            residence,
            details,
            position,
            messageCount: thread.messages.length,
          });
        }

        // Path 3: New or changed — full LLM extraction
        let details = await extractAppointmentDetailsWithLLM(thread, currentYear);

        if (!details.date && offer.showingText) {
          const showingDetails = await extractAppointmentDetailsFromShowingText(
            offer.showingText,
            currentYear,
          );
          if (showingDetails.date && (showingDetails.startTime || showingDetails.endTime)) {
            details = showingDetails;
          }
        }

        return mapAppointmentToDomain({
          offer,
          residence,
          details,
          position,
          messageCount: thread.messages.length,
        });
      }),
    );

    return results.filter(
      (a): a is NonNullable<typeof a> => a !== null,
    );
  } catch (error) {
    console.error("Failed to fetch upcoming appointments:", error);
    throw error;
  }
}
```

- [ ] **Step 4: Verify the server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No type errors (or only pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add server/src/findbolig-service.ts
git commit -m "feat: add 3-path incremental sync logic to getUpcomingAppointments"
```

---

### Task 4: Add `POST /api/appointments/sync` endpoint

**Files:**
- Modify: `server/src/index.ts:143-153`

- [ ] **Step 1: Import the sync request type**

Add to the imports at the top of `server/src/index.ts`:

```ts
import type { SyncAppointmentsRequest } from "@/types";
```

- [ ] **Step 2: Add the POST sync endpoint**

Add this right after the existing `appointments.get("/upcoming", ...)` block (after line 153):

```ts
appointments.post("/sync", async (c) => {
  try {
    const body = await c.req.json<SyncAppointmentsRequest>();
    const cached = Array.isArray(body?.cached) ? body.cached : [];
    const includeAll = body?.includeAll === true;
    const result = await withReauth(c, (cookies) =>
      findboligService.getUpcomingAppointments(cookies, includeAll, cached)
    );
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});
```

- [ ] **Step 3: Verify the server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No type errors (or only pre-existing ones).

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add POST /api/appointments/sync endpoint"
```

---

## Chunk 3: Client-Side Changes

### Task 5: Update serialization to handle `messageCount`

**Files:**
- Modify: `client/src/lib/serialization.ts:6-14`

- [ ] **Step 1: Default `messageCount` to 0 for old cache entries**

Update the `deserializeAppointments` function to include `messageCount` defaulting:

```ts
export function deserializeAppointments(data: any[]): Appointment[] {
  return data.map((item) => ({
    ...item,
    offerId: item.offerId ?? item.id?.replace(/^DEAS-O-/, "") ?? "",
    messageCount: item.messageCount ?? 0,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/serialization.ts
git commit -m "feat: default messageCount to 0 in deserialization"
```

---

### Task 6: Add `syncAppointments` client function

**Files:**
- Modify: `client/src/data/appointmentsSource.ts:58-90`

- [ ] **Step 1: Import the sync request type**

Add to the imports at the top of `client/src/data/appointmentsSource.ts`:

```ts
import type { CachedAppointmentEntry, SyncAppointmentsRequest } from "@/types";
```

- [ ] **Step 2: Add `syncAppointments` function**

Add this after the existing `fetchAppointments` function (after line 90):

```ts
export async function syncAppointments(
  cached: CachedAppointmentEntry[],
  includeAll: boolean = false,
): Promise<{
  updatedAt: Date;
  appointments: Appointment[];
}> {
  const body: SyncAppointmentsRequest = { cached, includeAll };
  const result = await fetchWithTimeout(
    `${config.backendDomain}/api/appointments/sync`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
    TIMEOUT_APPOINTMENTS,
  );
  if (!result.ok) {
    throw new HttpError(`Failed to sync appointments: ${result.status}`, result.status);
  }
  const data = await result.json();
  return { updatedAt: new Date(), appointments: data as Appointment[] };
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/data/appointmentsSource.ts
git commit -m "feat: add syncAppointments client function"
```

---

### Task 7: Wire up cache-aware sync in the data layer

**Files:**
- Modify: `client/src/data/appointments.ts`

- [ ] **Step 1: Update imports**

Replace the import from `appointmentsSource` to also include `syncAppointments`:

```ts
import { fetchAppointments, syncAppointments } from "./appointmentsSource";
```

Also add the type import:

```ts
import type { CachedAppointmentEntry } from "@/types";
```

- [ ] **Step 2: Add helper to build cache entries from localStorage**

Add this function before `getAppointments`:

```ts
function buildCacheEntries(): CachedAppointmentEntry[] {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) return [];
  try {
    const parsed = JSON.parse(cached);
    const appointments = parsed.appointments ?? [];
    return appointments.map((appt: any) => ({
      offerId: appt.offerId ?? appt.id?.replace(/^DEAS-O-/, "") ?? "",
      messageCount: appt.messageCount ?? 0,
      date: appt.date ?? null,
      appointment: appt,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 3: Update `getAppointments` to use `syncAppointments`**

Replace the existing `getAppointments` function:

```ts
export async function getAppointments(forceRefresh: boolean = false, includeAll: boolean = false) {
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

  const cacheEntries = buildCacheEntries();
  const payload = cacheEntries.length > 0
    ? await syncAppointments(cacheEntries, includeAll)
    : await fetchAppointments(includeAll);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}
```

- [ ] **Step 4: Verify the client compiles**

Run: `cd client && npx vue-tsc --noEmit`
Expected: No type errors (or only pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add client/src/data/appointments.ts
git commit -m "feat: wire up cache-aware incremental sync in data layer"
```

---

## Chunk 4: Manual Verification

### Task 8: End-to-end verification

- [ ] **Step 1: Start the dev server**

Run: `cd server && npm run dev` (in one terminal)
Run: `cd client && npm run dev` (in another terminal)

- [ ] **Step 2: Test first sync (empty cache)**

1. Clear localStorage in the browser (DevTools → Application → Local Storage → Clear)
2. Click "Sync data"
3. Verify: appointments load (full processing, same as before)
4. Verify: `appointments_cache` in localStorage now contains entries with `messageCount` fields

- [ ] **Step 3: Test second sync (cache populated)**

1. Click "Sync data" again without clearing cache
2. Verify: the sync is noticeably faster (server skips LLM for unchanged threads)
3. Verify: results are identical to first sync
4. Check server logs: should see fewer OpenAI API calls

- [ ] **Step 4: Test past appointment handling**

1. If any appointments have dates in the past, verify they still appear in the list
2. Verify server logs show those offers were skipped entirely (no API calls)

- [ ] **Step 5: Test mock data path still works**

1. If `useMockData` config exists, toggle it on
2. Verify mock data still loads correctly (uses `fetchAppointments`, not `syncAppointments`)

- [ ] **Step 6: Final commit with any fixes**

If any issues found during testing, fix and commit.

# Incremental Appointment Sync

## Problem

The "Sync data" flow for appointments is slow. Each sync fetches all offers from findbolig.nu, loads residence/thread/position data for each one, and runs OpenAI extraction on every thread. With 15-20 offers this means 60-100 HTTP requests including 15-20+ LLM calls, taking 30-60+ seconds. None of the server-side work is cached, and the server (Cloud Run) is stateless with no persistent storage.

## Solution

Client-aware incremental sync. The client already caches appointments in localStorage. On sync, it sends its cached data back to the server so the server can skip expensive work for unchanged or past appointments.

## Design Decisions

- **Message count as change detector:** findbolig.nu threads are append-only (messages are never edited, new messages are sent instead). Comparing `thread.messages.length` against the cached `messageCount` is sufficient to detect changes.
- **Past appointments: skip all processing, echo cached data.** Past appointments are still returned (stay visible in UI) but no API calls or LLM extraction is done for them.
- **Same response shape:** The server still returns `Appointment[]`. The client doesn't need new merge/diff logic.
- **Graceful degradation:** Empty cache (first load, cleared storage) results in full processing, identical to current behavior.
- **No extra infrastructure:** No Redis, Firestore, or persistent storage needed. The client's localStorage is the cache.

## Shared Types

Add to `shared/types.ts`:

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

Add `messageCount?: number` (optional) field to the existing `Appointment` type. This is populated by the server from `thread.messages.length` and flows through to the client cache. It is optional so that old cached data (which lacks the field) remains valid TypeScript. The deserialization layer defaults missing values to 0, which causes a mismatch on next sync and triggers full reprocessing (self-healing).

## Server Changes

### New endpoint: `POST /api/appointments/sync`

Replaces `GET /api/appointments/upcoming` as the primary sync endpoint. The GET endpoint remains for backward compatibility.

**Request body:** `SyncAppointmentsRequest`
**Response:** `Appointment[]`

### Processing logic in `getUpcomingAppointments`

Accept an optional `cached` parameter (a Map of `offerId -> CachedAppointmentEntry`).

For each offer, the server follows one of three paths:

| # | Condition | Action | Calls saved |
|---|-----------|--------|-------------|
| # | Condition | Action | Calls saved |
|---|-----------|--------|-------------|
| 1 | Offer has a cached entry with a non-null `date` that is before today | Echo back `cachedEntry.appointment` directly | All: 3 API + 1-2 LLM |
| 2 | Offer has a cached entry; thread fetched and `thread.messages.length === cachedEntry.messageCount` | Fetch residence + position (for live financial/position data), but skip all LLM extraction and reuse cached date/time/cancelled details | 1-2 LLM calls |
| 3 | No cache entry, or thread message count changed, new offer, or cached `date` is `null` | Full processing (current behavior) | None |

**Path 1** skips everything (no residence, thread, or position fetch). The appointment data is frozen. Only applies when `date` is a non-null string that parses to a date strictly before today. If `date` is `null` (LLM couldn't extract a date), the appointment is NOT treated as past — it falls to Path 2 or 3.

**Path 2** still fetches the thread (to compare message count), residence (for live financial/image data), and position (queue number changes frequently). It skips **both** LLM extraction calls — the thread-based extraction (`extractAppointmentDetailsWithLLM`) AND the `showingText` fallback (`extractAppointmentDetailsFromShowingText`). The `AppointmentDetails` (date, startTime, endTime, cancelled) are taken from the cached appointment.

**Path 3** is the existing behavior, unchanged.

### Domain mapping

`mapAppointmentToDomain` in `findbolig-domain.ts` currently accepts `{ offer, residence, details, position }`. Add `messageCount` to this parameter object so the function can include it in the returned `Appointment`. The value comes from `thread.messages.length`.

### GET endpoint

The existing `GET /api/appointments/upcoming` remains and calls `getUpcomingAppointments` with no `cached` parameter, triggering full processing for all offers. No implementation changes needed for the GET endpoint.

### Validation

The server should tolerate malformed or unexpected `cached` entries gracefully. If a `CachedAppointmentEntry` references an `offerId` not in the current offers list, it is simply ignored. If the `cached` array is missing or invalid, fall back to full processing.

### `includeAll` interaction

The `includeAll` filter is applied to the fresh offers list before cache lookups. Only offers that pass the filter are processed. Cached entries for offers that don't pass the filter are ignored.

## Client Changes

### `shared/types.ts`
- Add `messageCount?: number` (optional) to `Appointment` type
- Add `CachedAppointmentEntry` and `SyncAppointmentsRequest` types

### `client/src/data/appointmentsSource.ts`
- New function `syncAppointments(cached: CachedAppointmentEntry[], includeAll: boolean)` that sends `POST /api/appointments/sync`
- Keeps existing `fetchAppointments` for backward compatibility / mock data path

### `client/src/data/appointments.ts`
- `getAppointments(forceRefresh, includeAll)` builds `CachedAppointmentEntry[]` from the localStorage cache and calls `syncAppointments` instead of `fetchAppointments`
- If cache is empty or invalid, sends `cached: []` (triggers full processing)

### `client/src/stores/appointments.ts`
- Minimal changes. The store calls `getAppointments` as before; the data layer handles cache-aware sync internally.

### `client/src/lib/serialization.ts`
- Handle `messageCount` in deserialization (default to 0 for old cached data without the field)

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| First sync / empty cache | `cached: []` sent, server does full processing for all offers |
| Offer removed upstream | Server fetches current offers list; removed offers are not in the response and disappear from the client |
| Offer state changes (accepted/declined) | Path 1 (past): echoed as-is (state changes don't matter for past). Path 2 (unchanged thread): offer state is fetched fresh from the offers list and applied |
| Thread goes from 0 to 1+ messages | `messageCount` mismatch (0 vs N) triggers Path 3, full processing |
| Old cached data without `messageCount` | Deserialization defaults to 0, which will mismatch against any thread with messages, triggering full reprocessing (self-healing) |

## Performance Impact

Assuming 15 offers where 5 are past, 8 are unchanged, and 2 have new messages:

| | Before | After |
|---|--------|-------|
| findbolig API calls | 46 (1 offers list + 15x3 per-offer) | 31 (1 offers list + 8x3 unchanged + 2x3 new, 5 past skipped entirely) |
| OpenAI LLM calls | 15-30 | 2-4 (only new/changed offers) |
| Estimated time | 30-60s | 5-15s |

The biggest win is eliminating LLM calls for unchanged and past offers.

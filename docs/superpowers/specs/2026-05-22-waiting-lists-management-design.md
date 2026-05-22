# Waiting Lists Management Design

Display and manage a user's property waiting lists from findbolig.nu: see all lists at a glance, detect and act on properties that have been silently flipped to Passive, reactivate per-property or in bulk, and unsubscribe from individual lists.

## Context

FindBolig.nu maintains a per-property waiting list for each housing application. Properties on the list can be Active (you receive offers) or Passive (you don't, but you keep accruing seniority in most orgs). Lists go Passive periodically without notification — currently the user has no way to learn this except by manually inspecting `/da-dk/profile/my-waiting-lists` on findbolig.nu. This feature surfaces that state in fetchBolig and lets the user fix it.

### Data hierarchy

```
Organization (e.g. PFA)
  └── Property (e.g. "Hasselgården")  ← the user-facing "waiting list"
        └── Residence (an individual apartment unit)
```

The `residence-applications` endpoint returns **one row per residence** the user has applied for, but `set-active` is a property-level action. The feature treats the **property** as the unit of "a waiting list", aggregating residence rows on `propertyId`.

### Discovered endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/data/residence-applications` | Raw per-residence rows |
| `POST` | `/api/search` with `{ filters: { propertyId: [...] }, mixedResults: true, pageSize: N }` | Enriches with property metadata (name, address, images, rent range, org info) |
| `GET` | `/api/search/waiting-lists/applicants/position-for-property/{propertyId}` | Best-position info for a property |
| `POST` | `/api/data/residence-applications/property/{propertyId}/set-active` | Reactivate |
| `DELETE` | `/api/data/residence-applications/property/{propertyId}` (→ 204) | Unsubscribe |

The `membership-organizations` endpoint exists but is **not used** in v1 — org name/logo come from the search response instead.

### Key absence in the data

There is **no expiration / next-confirmation timestamp**. The `inactiveDate` field is always null even on Passive rows. The only signal we have is `status` ("Active"/"Passive"). Detection of just-flipped-to-Passive lists therefore relies on a client-side **snapshot diff**.

## Scope

### In scope (v1)

- Status-grouped page (Passive first, expanded; Active second, collapsed)
- Per-property reactivate; bulk "reactivate all passive" with concurrency cap 5
- Detail sheet with image gallery, rent/area/rooms ranges, "Open on findbolig.nu" link, and unsubscribe (with confirmation)
- Org logo + name as a chip on each card
- In-app alert (banner) on app open when one or more properties just flipped Active → Passive since last sync
- Position info on each card: "Bedste placering" + "Skrevet op til N boliger"
- Demo / mock data for the four UI states

### Out of scope (v1)

- Membership-organization management UI (seniority, verified status, quarantine)
- Proactive "expires in N days" prediction (no data to support it)
- Push notifications outside the app
- Per-residence drill-down (property-level only)
- Incremental sync (data is small enough that full refresh is fine)

## Data Model

### Shared types

```typescript
// shared/types.ts
export type WaitingListStatus = "Active" | "Passive";

export type WaitingList = {
  propertyId: string;
  status: WaitingListStatus;

  // Property metadata (from /api/search)
  propertyShortId: number;             // for building the findbolig.nu link
  name: string;                        // "Hasselgården"
  address: string;                     // "Ålekistevej 59. m. fl, 2720 Vanløse"
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
  residencesAppliedCount: number;      // residences in this property the user is signed up for
  bestPosition: number | null;         // min position across applied residences, null if unknown
  appliedSince: string;                // earliest `created` from residence-applications rows, ISO

  // Organization (from search response, NOT from membership-organizations)
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
```

### Client-local snapshot (for transition detection)

```typescript
// client-side only, persisted in localStorage under "waiting_lists_snapshots"
export type WaitingListSnapshot = {
  propertyId: string;
  status: WaitingListStatus;
  observedAt: string;  // ISO; metadata for debugging / future "passive since" feature
};
```

### Server-side API types

```typescript
// server/src/types/waiting-lists.ts
const ApiResidenceApplication = z.object({
  residenceId: z.string(),
  propertyId: z.string(),
  companyId: z.string(),
  userId: z.string(),
  inactiveDate: z.string().nullable(),  // always null in observed data; preserved for safety
  status: z.enum(["Active", "Passive"]),
  created: z.string(),
});
```

The `/api/search` property result shape is already partially typed for the offers feature; extend or share. The `position-for-property/{propertyId}` response shape will be confirmed at first call — the mapper accommodates either `number` or an array of per-residence positions (in which case we take the min).

## Backend

### New service functions (`server/src/findbolig-service.ts`)

```typescript
// Raw fetches
fetchResidenceApplications(cookies): Promise<ApiResidenceApplication[]>
//   GET /api/data/residence-applications

searchPropertiesByIds(propertyIds, cookies): Promise<ApiPropertySearchResult[]>
//   POST /api/search { filters: { propertyId }, mixedResults: true, pageSize: propertyIds.length }

getPositionForProperty(propertyId, cookies): Promise<unknown>
//   GET /api/search/waiting-lists/applicants/position-for-property/{propertyId}

// Mutations
setWaitingListActive(propertyId, cookies): Promise<void>
//   POST /api/data/residence-applications/property/{propertyId}/set-active

unsubscribeFromWaitingList(propertyId, cookies): Promise<void>
//   DELETE /api/data/residence-applications/property/{propertyId}
```

All use `fetchWithTimeout` with `TIMEOUT_DATA` (20s). Mutations throw `UpstreamHttpError` on non-2xx, matching the existing pattern.

### Aggregation: `getWaitingLists(cookies)`

The composite operation the route handler calls.

1. `fetchResidenceApplications(cookies)` → raw rows.
2. Group rows by `propertyId`. Per group compute:
   - `status` — if **any** row in the group is Active → property Active; only if **all** rows are Passive → property Passive. (Defensible interpretation of the property-level `set-active` semantic. To re-evaluate if implementation reveals mixed states we didn't anticipate.)
   - `residencesAppliedCount = group.length`
   - `appliedSince = min(group.map(r => r.created))`
3. `searchPropertiesByIds(propertyIds, cookies)` — single batched call.
4. For each property, `getPositionForProperty(propertyId, cookies)` in parallel with **concurrency cap 5**. Failures non-fatal (`.catch(() => null)`); card shows "—".
5. Map and merge into `WaitingList[]` via `mapWaitingListToDomain({ group, property, position })` in `lib/findbolig-domain.ts`.
6. Skip properties for which the search response is missing (defensive).

Returns `WaitingList[]`.

### New API routes (`server/src/index.ts`)

```typescript
const waitingLists = new Hono().basePath("/waiting-lists");

waitingLists.get("/", async (c) => {
  const result = await withReauth(c, (cookies) =>
    findboligService.getWaitingLists(cookies)
  );
  return c.json(result);
});

waitingLists.post("/:propertyId/set-active", async (c) => {
  const propertyId = c.req.param("propertyId");
  if (!propertyId) return c.json({ error: "Property ID is required" }, 400);
  await withReauth(c, (cookies) =>
    findboligService.setWaitingListActive(propertyId, cookies)
  );
  return c.json({ ok: true });
});

waitingLists.delete("/:propertyId", async (c) => {
  const propertyId = c.req.param("propertyId");
  if (!propertyId) return c.json({ error: "Property ID is required" }, 400);
  await withReauth(c, (cookies) =>
    findboligService.unsubscribeFromWaitingList(propertyId, cookies)
  );
  return c.json({ ok: true });
});
```

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/api/waiting-lists/` | `getWaitingLists` |
| `POST` | `/api/waiting-lists/:propertyId/set-active` | `setWaitingListActive` |
| `DELETE` | `/api/waiting-lists/:propertyId` | `unsubscribeFromWaitingList` |

All wrapped in `withReauth`. No bulk endpoint server-side — the client fans out parallel `set-active` calls to keep the server stateless and let the client own progress UI.

**Known interaction with `withReauth`:** each parallel client→server POST is a separate server request that passes through `withReauth` independently. If the upstream findbolig session has expired, each request will observe a 401 and call `login()` on findbolig.nu concurrently — multiplying re-auth traffic by the fan-out factor (up to 5). The browser cookie ends up set to whichever sealed-session response finishes last, which is fine because all are valid sessions for the same user. Functionally correct but wasteful in this edge case. Acceptable for v1 given typical bulk sizes (a handful of properties); if it becomes a problem, the plan can introduce a single warm-up call before fan-out.

## Frontend

### Route

```typescript
// router/index.ts
{
  path: "/waiting-lists",
  name: "waiting-lists",
  component: () => import("~/views/WaitingListsView.vue"),
}
```

### Data layer

**`client/src/data/waitingListsSource.ts`** (mirrors `offersSource.ts`):
- `fetchWaitingLists()` → `GET /api/waiting-lists/`. Timeout 90s (server aggregates many sub-requests).
- `setWaitingListActive(propertyId)` → `POST /api/waiting-lists/:propertyId/set-active`. Timeout 25s.
- `unsubscribeFromWaitingList(propertyId)` → `DELETE /api/waiting-lists/:propertyId`. Timeout 25s.
- Mock branch (`config.useMockData`) returns `MOCK_WAITING_LISTS.json` (see Mocks).

**`client/src/data/waitingLists.ts`** (mirrors `data/offers.ts`):
- `STORAGE_KEY = "waiting_lists_cache"`
- `getWaitingLists(forceRefresh)`, `persistWaitingListsCache`, `getWaitingListsCacheAge`, `isWaitingListsCacheStale` (24h threshold)
- Plus: `getSnapshots()` / `persistSnapshots(WaitingListSnapshot[])` under key `waiting_lists_snapshots`

### Pinia store: `useWaitingListsStore`

Follows the offers store pattern with two additions: `isMutating` and `recentlyPassivated`.

```typescript
state:
  lists: Ref<WaitingList[]>
  updatedAt: Ref<Date | null>
  isLoading: Ref<boolean>
  isMutating: Ref<boolean>           // any set-active / unsubscribe in flight
  needsRefresh, sessionExpired       // same as offers
  recentlyPassivated: Ref<string[]>  // propertyIds that flipped Active→Passive on most recent sync

actions:
  init()                          // load cache, queue refresh if stale
  refresh()                       // hard refetch + run snapshot diff
  setActive(propertyId)           // optimistic: flip locally + persistWaitingListsCache → POST →
                                  //   on failure revert + persist again + toast
  reactivateAll()                 // gather Passive ids, p-limit(5) parallel setActive calls,
                                  //   counter rendered on the in-progress button ("Aktiverer X af N"),
                                  //   final summary toast
  unsubscribe(propertyId)         // confirmation lives in component; this just runs DELETE,
                                  //   removes from `lists` + persistWaitingListsCache on success
  dismissPassivatedBanner()       // clears recentlyPassivated[] in memory only
  getImageUrl(path)               // same as offers — used both for property images and org logos
                                  //   (organization.logoUrl, company.logoUrl)
```

**State persistence summary:**
- `lists` is mirrored to localStorage cache after every successful mutation (`setActive`, `unsubscribe`) — same invariant offers maintains via `persistOffersCache`.
- `recentlyPassivated` is **in-memory only**. The snapshot diff already encodes the "since-last-refresh" semantic: once snapshots are overwritten at the end of a refresh, the next refresh won't re-detect the same transition. Persisting `recentlyPassivated` would just duplicate that signal and risk going stale.
- `WaitingListSnapshot[]` is the only piece of state that persists *for diffing purposes* across sessions.

### Composable: `useGroupWaitingLists(lists)`

Returns `{ key: "Passive" | "Active", label, lists, isFirst }[]`:
1. Split into Passive and Active.
2. Within each, sort by `name` ascending.
3. `Passive` is always first and expanded by default; `Active` is collapsed by default.

### Components

**`views/WaitingListsView.vue`** — page shell. Title `t("waitingLists.pageTitle")`, count, refresh button. Same auth-redirect-if-no-cache pattern as `OffersView`. Renders:
1. `<PassivatedBanner>` if `store.recentlyPassivated.length > 0`
2. `<WaitingListsList>`

**`components/waitingList/PassivatedBanner.vue`** — amber banner: title + body (see i18n), inline property names. "Reactivate all" button + dismiss (X).

**`components/waitingList/WaitingListsList.vue`** — calls `store.init()` on mount. Loading skeletons (reuse `CompactCardSkeleton`). Passes grouped lists to `WaitingListGroup`. Empty state when no lists.

**`components/waitingList/WaitingListGroup.vue`** — reuses `AppointmentGroup`/`OfferGroup` collapsible header pattern. The Passive group's header includes a small "Reactivate all" button (visible only when `lists.length > 0` and `key === "Passive"`); fires `store.reactivateAll()`. While the bulk action runs, the button text is replaced with a live counter ("Aktiverer X af N") driven by store state. Grid layout: 1 col mobile, 2 cols desktop.

**No map button on the group header.** Offers and appointments include one because those are geographic, time-bounded decisions ("which open house should I attend?"). Waiting lists are not actionable on a map — you don't go to them — so the affordance is deliberately omitted in v1.

**`components/waitingList/WaitingListCard.vue`** — compact card. Shows:
- Thumbnail (`compactThumb` transform)
- Property name (truncated), address
- Status pill (green "Aktiv" or amber/red "Passiv")
- Org chip with `organizationLogo` + name
- Best position ("Bedste placering: 3" or "—")
- Residences applied ("Skrevet op til 12 boliger")
- Rent range ("3.104 – 9.401 kr/md")
- Inline "Meld mig aktiv" button when Passive (calls `store.setActive(propertyId)`)
- Click elsewhere opens `WaitingListDetailSheet`

**`components/waitingList/WaitingListDetailSheet.vue`** — based on existing detail-sheet pattern (drag-to-dismiss, backdrop, history API). Contents:
- Image gallery (Swiper) + photo count
- Title, full address with map link
- Rent / area / rooms ranges
- Best position, residences applied, applied-since date (the only place `appliedSince` is surfaced)
- Org chip
- Action area adapts to status (Passive → prominent "Meld mig aktiv"; Active → muted status text)
- "Åbn på findbolig.nu" link → `https://findbolig.nu/property/${propertyShortId}`
- Danger zone: "Fjern mig fra ventelisten" → opens `ConfirmUnsubscribeDialog`

**`components/waitingList/ConfirmUnsubscribeDialog.vue`** — similar to the offers feature's `ConfirmActionDialog`. Property name + irreversibility/seniority warning. Cancel + Confirm. Loading state during DELETE.

### Navigation

Add fourth nav entry to `BottomNav.vue`: **"Ventelister"** (icon: a list/queue icon). Badge with `recentlyPassivated.length` when > 0.

## Alert Flow & Snapshot Lifecycle

### Lifecycle

```
First-ever load:
  - No snapshots stored yet
  - Fetch lists → write snapshots → recentlyPassivated = [] (no alert, baseline only)

Subsequent loads (on app open / manual refresh):
  - Load prev snapshots from localStorage
  - Fetch fresh lists
  - For each list: prev = prevSnapshots.find(propertyId)
      - prev.status === "Active" && list.status === "Passive" → enters recentlyPassivated
      - prev missing (newly-discovered list) → not an alert; just baseline
      - all other cases → no alert
  - Write fresh snapshots (overwrite)
  - If recentlyPassivated.length > 0 → render <PassivatedBanner>
```

### When the diff runs

In `store.refresh()`, after a successful fetch and before assigning `lists.value`. Diff and `persistSnapshots` happen in the same tick. `init()` reading from cache only does **not** produce alerts.

### Interaction with reactivate

When the user clicks "Meld mig aktiv":
1. Optimistic: status flips Active locally, card moves out of Passive group on next render.
2. POST set-active. On success: persist the new state to snapshots immediately (don't re-alert on next sync). Toast success.
3. On failure: revert the local flip, toast error.
4. Remove the propertyId from `recentlyPassivated` (success or failure — user has acknowledged).

For `reactivateAll`: same per-item logic, concurrency cap 5. Banner stays until all succeed or user dismisses. Final toast summarises ("Reactivated 6 of 7 — 1 failed: <name>").

### Interaction with unsubscribe

On confirmed DELETE success:
- Remove from `lists.value`
- Remove its snapshot from stored snapshots (re-applying later starts fresh as baseline, not transition)
- Remove from `recentlyPassivated` if present
- Toast success

### Edge cases

| Case | Behaviour |
|------|-----------|
| User unsubscribed externally on findbolig.nu | Next refresh: list gone; snapshot silently dropped. No alert. |
| User re-applies externally | Next refresh: new list with no prior snapshot → silent baseline, no false alert. |
| Bulk reactivate where some fail (quarantine etc.) | Successful items flip, failures stay Passive and in `recentlyPassivated`. Summary toast names the failures. |
| Position fetch fails for one property | Property still appears; `bestPosition: null`; card shows "—". |
| First load after localStorage was cleared | Behaves like first-ever load; no alerts. Strictly better than alerting on every list at once. |
| User dismisses the banner without acting | `dismissPassivatedBanner()` empties array but does NOT touch snapshots. Won't re-alert. Passive section of the page still shows the lists. |

### Things deliberately not done

- **Persistent "needs attention" badge that survives multiple refreshes until acted on.** The Passive section of the page IS the persistent indicator. The banner is "since-last-time" only.
- **Snapshot history beyond the latest.** Last-known-state is enough for diff.
- **Per-residence diffing.** Property-level matches the user's mental model.

## Mocks

`client/src/data/MOCK_WAITING_LISTS.json` — 4 fixtures covering UI states:

1. **PFA / Hasselgården** — Active, 18 residences applied, best position 333. Typical active card.
2. **PFA / Dronningens Tværgade** — Passive, 2 residences applied, best position null. Passive + "—" position fallback.
3. **Sampension / Jægersborg Allé** — Active, 5 residences, best position 12. Org variety on chip.
4. **PFA / Vodroffsvej** — Passive, 8 residences, best position 47. Multiple Passive entries for the "Reactivate all" affordance and banner.

Mock `recentlyPassivated` is populated on first mock load (the two Passive entries) so demo users see the banner. Sticky between demo refreshes via the same snapshot mechanism.

Mock action handlers (mock branch of `waitingListsSource.ts`): `setWaitingListActive` flips status locally with a 600ms delay; `unsubscribeFromWaitingList` removes from the array with a 600ms delay. No server calls.

## i18n

Strings added under `waitingLists.*` in both `da.json` and `en.json`. Key groupings: `pageTitle`, `count`, `refresh`, `empty`, `groups.{passive,active}`, `card.*`, `detail.*`, `actions.*`, `banner.*`, `confirm.unsubscribe.*`. Danish copy is the canonical reference (the user is Danish-speaking and this is a Danish housing service); English mirrors structure.

Indicative samples:

```jsonc
"waitingLists.banner.title": "Du er blevet sat passiv" / "You've been set passive",
"waitingLists.banner.body":
  "{n} venteliste er gået passiv siden sidst. Aktivér den igen for at modtage tilbud. |
   {n} ventelister er gået passive siden sidst. Aktivér dem igen for at modtage tilbud.",
"waitingLists.card.reactivate": "Meld mig aktiv" / "Set active",
"waitingLists.detail.unsubscribe": "Fjern mig fra ventelisten" / "Remove me from waiting list",
"waitingLists.confirm.unsubscribe.body":
  "Du mister din anciennitet og skal starte forfra hvis du skriver dig op igen. Dette kan ikke fortrydes." /
  "You will lose your seniority and have to start over if you re-apply. This cannot be undone."
```

## Error Handling

All API errors flow through the existing `handleApiError` + toast pattern used by offers/appointments.

| Failure | Behaviour |
|---------|-----------|
| `GET /waiting-lists` fails on initial load | Toast error; render empty state. If cache exists, fall back to cache + show `StaleDataBanner`. |
| `GET /waiting-lists` fails on refresh | Keep current `lists.value`; toast error; do **not** run diff or overwrite snapshots. |
| `POST set-active` fails (single card) | Revert optimistic flip; toast `reactivateFailed` with property name. |
| Bulk reactivate, partial failure | Per-item revert for failures; summary toast `reactivateAllPartial`. Successes stay flipped. |
| `DELETE unsubscribe` fails | Property stays in list; toast `unsubscribeFailed`; dialog stays open. |
| 401 on any call | Existing `withReauth` retries; on failure `sessionExpired.value = true` (same as offers). |
| Concurrent refreshes | `refresh()` early-returns if `isLoading.value === true` (same guard as offers). |

## Testing / Verification

Project doesn't currently rely on a heavy automated test suite — verification leans on demo-mode fixtures and manual integration runs. Approach for this feature:

- **Demo mode**: load the page in demo, verify all four mock states render correctly (Active, Passive, banner, empty after unsubscribe).
- **Aggregation correctness**: smoke check that `getWaitingLists` correctly groups a known mixed Active/Passive residence-applications fixture into one Active and one Passive `WaitingList`.
- **Snapshot diff correctness**: unit-style verification of the diff logic with three fixtures (first run, no transitions, Active→Passive transition).
- **Manual integration**: run against a real findbolig.nu account, verify all five flows (view, single reactivate, bulk reactivate, unsubscribe, alert on a simulated transition by manually wiping snapshots).

Whether to set up dedicated test infrastructure is a decision deferred to the implementation plan.

## Reused (no changes)

- `BaseCollapse`, `ImageGalleryModal`, `MapModal`, `useScrollLock`, `useDarkMode`
- `imageTransform` (`compactThumb`, `galleryImage`)
- `formatCurrency`, `dateHelper`
- `withReauth`, `fetchWithTimeout`, `UpstreamHttpError`, `TimeoutError`
- `StaleDataBanner`, toast store, `handleApiError`

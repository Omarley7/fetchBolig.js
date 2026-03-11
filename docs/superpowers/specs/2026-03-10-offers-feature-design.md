# Offers Feature Design

Display and manage housing offers from findbolig.nu, allowing users to view, accept, and decline offers before their deadlines.

## Context

FindBolig.nu sends housing offers to users who are on waiting lists. Each offer has a deadline by which the user must respond. Users can accept, decline, and change their mind until the deadline expires. The existing appointments feature handles open house scheduling; this feature handles the offer response flow.

The upstream accept/decline endpoints (`POST /api/data/offers/{offerId}/accept` and `/decline`) were discovered by inspecting network traffic on findbolig.nu. The `/api/data/` prefix is used for offer-specific mutation endpoints, distinct from the `/api/search/` read endpoints.

## Data Model

### Shared Type: `Offer`

```typescript
export type Offer = {
  id: string;                // offer UUID from findbolig
  residence: Pick<Residence, "adressLine1" | "adressLine2" | "location">; // match Appointment pattern (typo preserved)
  deadline: string | null;   // ISO date — response deadline
  availableFrom: string | null; // ISO date — move-in date
  recipientState: "OfferReceived" | "OfferAccepted" | "OfferDeclined";
  company: string;           // landlord company name (from offer.company, fallback to offer.organization)
  financials: Financials;    // reuse existing Financials type
  imageUrl: string;          // images[0] or empty string
  images: string[];          // all residence images
  blueprints: string[];      // floor plan images
  position: number | null;   // queue position (number from API, null if unavailable)
};
```

Uses the same `residence` pattern as `Appointment` for consistency, including the existing `adressLine1`/`adressLine2` typo.

### Recipient States

- `OfferReceived` — new offer, user has not responded
- `OfferAccepted` — user accepted the offer
- `OfferDeclined` — user declined the offer

### Schema Update: `ApiOfferRecipient`

Add typed recipient schema to `server/src/types/offers.ts`:

```typescript
const ApiOfferRecipient = z.object({
  created: z.string(),
  updated: z.string(),
  accepted: z.string().nullable(),
  declined: z.string().nullable(),
  received: z.string().nullable(),
  offerId: z.string(),
  userId: z.string(),
  state: z.enum(["OfferReceived", "OfferAccepted", "OfferDeclined"]),
  internalState: z.string().nullable(),
  note: z.string().nullable(),
});
```

Update `ApiOffer.recipients` from `z.array(z.unknown()).optional()` to `z.array(ApiOfferRecipient).optional()`.

## Backend

### New Service Function: `getActiveOffers(cookies)`

1. Call `fetchOffers(cookies)` (existing function)
2. Filter for `state === "Published"`
3. For each offer, fetch in parallel:
   - `getResidence(offer.residenceId, cookies)` — residence details (uses existing `apiResidenceToDomain`)
   - `getPositionOnOffer(offer.id, cookies)` — queue position (returns a number, caught with `.catch(() => null)`)
4. Map to `Offer` domain type via `mapOfferToDomain`:
   - `recipients[0].state` → `recipientState` (default to `"OfferReceived"` if recipients array is empty/missing)
   - `offer.company ?? offer.organization ?? ""` → `company`
   - `residence.availableFrom` → `availableFrom`
   - `residence.addressLine1/2`, `residence.location`, `residence.images`, `residence.blueprints`, financial fields → same mapping as `mapAppointmentToDomain`
   - `images[0] ?? ""` → `imageUrl`
5. Skip offers where `residenceId` is missing or residence fetch fails
6. Return `Offer[]`

No LLM extraction or thread fetching needed — significantly lighter than `getUpcomingAppointments`.

### New Service Functions: `acceptOffer` and `declineOffer`

New functions in `findbolig-service.ts`:

```typescript
export async function acceptOffer(offerId: string, cookies: string): Promise<ApiOffer>
export async function declineOffer(offerId: string, cookies: string): Promise<ApiOffer>
```

Proxy to findbolig.nu:
- `POST https://findbolig.nu/api/data/offers/{offerId}/accept` — empty body, cookie auth
- `POST https://findbolig.nu/api/data/offers/{offerId}/decline` — empty body, cookie auth

Both return the updated `ApiOffer` object. Extract `recipients[0].state` and return the new `recipientState` to the client.

### New API Routes

The existing `GET /api/offers/` route (returns raw `ApiOffer[]`) is kept for debugging. New routes added alongside:

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/api/offers/active` | `getActiveOffers` | Fetch Published offers with residence data |
| `POST` | `/api/offers/:offerId/accept` | `acceptOffer` | Accept an offer |
| `POST` | `/api/offers/:offerId/decline` | `declineOffer` | Decline an offer |

All routes use `withReauth` wrapper (existing auth pattern). The `/active` route is distinct from the existing `/` route.

## Frontend

### New Route

Add `/offers` to router with `OffersView` component.

### Page: `OffersView.vue`

Mirrors `AppointmentsView.vue`:
- Header with offer count
- Integrates `OffersList` component
- Redirects to `/` if unauthenticated and no cache

### Component: `OffersList.vue`

List container that:
- Calls offers store `init()` on mount
- Passes grouped offers to `OfferGroup` components
- Shows loading skeletons during fetch (reuse `CompactCardSkeleton`)
- Shows empty state when no offers

### Component: `OfferGroup.vue`

Reuses `AppointmentGroup` pattern:
- Collapsible header with group name and count badge
- "Afventer svar" group is expanded by default
- "Accepteret" group is collapsed by default
- Grid layout: 1 col mobile, 2 cols desktop
- Map button when >1 offer in group

### Component: `OfferCard.vue`

Based on `CompactCard.vue` pattern:
- Thumbnail image (lazy loaded, `compactThumb` transform)
- `residence.adressLine1` (truncated), `residence.adressLine2`
- Deadline urgency indicator (colored dot + relative time)
- Monthly rent, queue position
- Click opens `OfferDetailSheet`

### Component: `OfferDetailSheet.vue`

Based on `AppointmentDetailSheet.vue`:
- Same drag-to-dismiss, backdrop, history API integration
- Same image gallery (Swiper), photo count badge
- Same title, address with map link (using `residence.adressLine1/2`)
- Same financials summary button (opens `FinancialsModal`)
- "Open on FindBolig" button — URL constructed as `https://findbolig.nu/profile/my-offers?offerId=${offer.id}`

**Replaces** the open house date/calendar section with:
- **Deadline display** — formatted date + relative time + urgency color
- **Available from** — move-in date
- **Action area** — accept/decline buttons that adapt to current state:
  - `OfferReceived`: "Acceptér" (green) + "Afvis" (outlined)
  - `OfferAccepted`: "Fortryd accept" (outlined/warning) + "Afvis" (outlined)
  - `OfferDeclined`: "Acceptér" (green) + already declined indicator

### Component: `ConfirmActionDialog.vue`

Modal overlay for confirming accept/decline:
- Action description with address
- User details card (name, email from auth store)
- Note: "Du kan ændre dit svar indtil svarfristen udløber"
- Cancel + Confirm buttons
- Loading state during API call

### Store: `useOffersStore` (Pinia)

Same pattern as `useAppointmentsStore`:
- `offers: Ref<Offer[]>`
- `isLoading: Ref<boolean>`
- `init()` — load from cache or fetch
- `refresh()` — force re-fetch
- `acceptOffer(offerId)` — POST accept, update local offer's `recipientState`
- `declineOffer(offerId)` — POST decline, update local offer's `recipientState`
- `getImageUrl(path)` — same image URL construction
- Local storage caching with staleness check (cache key: `"offers_cache"`)

### Data Layer: `offersSource.ts`

- `fetchOffers()` — `GET /api/offers/active`
- `acceptOffer(offerId)` — `POST /api/offers/${offerId}/accept`
- `declineOffer(offerId)` — `POST /api/offers/${offerId}/decline`
- Same timeout and error handling patterns as `appointmentsSource.ts`
- Timeouts: 90s for fetch (matches appointments), 25s for accept/decline

### Composable: `useGroupOffers(offers)`

Groups and sorts offers:
1. Split into "Afventer svar" (`OfferReceived`) and "Accepteret" (`OfferAccepted`)
2. Within each group, sort by deadline ascending (soonest deadline first)
3. `OfferDeclined` offers are filtered out on the frontend (the backend returns them since the offer is still `Published`, but they are not shown)
4. Returns `{ key: string, label: string, offers: Offer[], isFirst: boolean }[]`

### Utility: `getDeadlineUrgency(deadline)`

Pure function returning urgency level:
- `null` deadline → `{ color: 'neutral', relative: 'Ingen frist' }` (no deadline)
- Today or past → `{ color: 'red', relative: 'i dag' }`
- Tomorrow → `{ color: 'red', relative: 'i morgen' }`
- 2-5 days → `{ color: 'amber', relative: 'N dage' }`
- &gt;5 days → `{ color: 'green', relative: 'N dage' }`

Used on both `OfferCard` and `OfferDetailSheet`.

## Reused Components (no changes)

- `BaseCollapse` — collapsible group animation
- `ImageGalleryModal` — full-screen image gallery
- `FinancialsModal` — financial breakdown modal
- `MapModal` — map with offer locations (accepts items with `residence.location`)
- `useScrollLock` — body scroll prevention
- `useDarkMode` — theme detection
- `imageTransform` utilities — `compactThumb`, `galleryImage`, `blueprintImage`
- `formatCurrency` — Danish currency formatting

## Navigation

Add "Tilbud" link to app navigation alongside existing "Aftaler" (appointments). Badge with count of `OfferReceived` offers to surface urgency.

## Error Handling

- Accept/decline failures show toast with error message
- Network errors during fetch show existing error patterns
- Session expiry triggers same recovery flow as appointments

## Mock Data

Add 3 mock offers to `mockData.ts` for demo mode:
1. `OfferReceived` with deadline tomorrow (tests red urgency)
2. `OfferReceived` with deadline in 5 days (tests amber urgency)
3. `OfferAccepted` with deadline in 10 days (tests accepted state + green urgency)

Each includes full residence data (financials, images, blueprints) matching the existing mock appointment data pattern.

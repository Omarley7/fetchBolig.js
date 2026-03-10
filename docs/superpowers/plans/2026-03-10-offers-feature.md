# Offers Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display and manage housing offers from findbolig.nu with accept/decline flow, deadline urgency indicators, and reusable bottom sheet detail view.

**Architecture:** Backend proxies offer CRUD to findbolig.nu with eager residence data loading. Frontend mirrors the existing appointments pattern: Pinia store with caching, grouped list view, bottom sheet detail, and confirmation dialogs. Shared `Offer` type in `shared/types.ts`.

**Tech Stack:** Vue 3, Pinia, Tailwind CSS, Hono.js, Zod, Swiper.js, vue-i18n

**Spec:** `docs/superpowers/specs/2026-03-10-offers-feature-design.md`

---

## Chunk 1: Backend — Types, Service Functions, API Routes

### Task 1: Update ApiOffer recipient schema

**Files:**
- Modify: `server/src/types/offers.ts:13` (replace `z.array(z.unknown()).optional()`)

- [ ] **Step 1: Add typed ApiOfferRecipient schema**

In `server/src/types/offers.ts`, add before the `ApiOffer` definition:

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

export type ApiOfferRecipient = z.infer<typeof ApiOfferRecipient>;
```

- [ ] **Step 2: Update ApiOffer.recipients field**

Change line 13 from:
```typescript
recipients: z.array(z.unknown()).optional(),
```
to:
```typescript
recipients: z.array(ApiOfferRecipient).optional(),
```

- [ ] **Step 3: Commit**

```bash
git add server/src/types/offers.ts
git commit -m "feat(offers): add typed ApiOfferRecipient schema"
```

---

### Task 2: Add Offer shared type

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: Add Offer and RecipientState types**

Append to `shared/types.ts`:

```typescript
export type RecipientState = "OfferReceived" | "OfferAccepted" | "OfferDeclined";

export type Offer = {
  id: string;
  residence: Pick<Residence, "adressLine1" | "adressLine2" | "location">;
  deadline: string | null;
  availableFrom: string | null;
  recipientState: RecipientState;
  company: string;
  financials: Financials;
  imageUrl: string;
  images: string[];
  blueprints: string[];
  position: number | null;
};
```

- [ ] **Step 2: Commit**

```bash
git add shared/types.ts
git commit -m "feat(offers): add Offer shared type"
```

---

### Task 3: Add mapOfferToDomain function

**Files:**
- Modify: `server/src/lib/findbolig-domain.ts`

- [ ] **Step 1: Add mapOfferToDomain**

Add import at top of `server/src/lib/findbolig-domain.ts`:
```typescript
import type { Offer, RecipientState } from "@/types";
```

Update the existing import to include `Offer`:
```typescript
import type { Appointment, Offer, RecipientState, UserData } from "@/types";
```

Add new function after `mapAppointmentToDomain`:

```typescript
export function mapOfferToDomain({
  offer,
  residence,
  position,
}: {
  offer: ApiOffer;
  residence: Residence;
  position: number | null;
}): Offer {
  const recipientState: RecipientState =
    (offer.recipients?.[0]?.state as RecipientState) ?? "OfferReceived";

  return {
    id: offer.id,
    residence: {
      adressLine1: residence.addressLine1,
      adressLine2: residence.addressLine2,
      location: residence.location,
    },
    deadline: offer.deadline ?? null,
    availableFrom: residence.availableFrom ?? null,
    recipientState,
    company: offer.company ?? offer.organization ?? "",
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
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/findbolig-domain.ts
git commit -m "feat(offers): add mapOfferToDomain domain mapping"
```

---

### Task 4: Add getActiveOffers, acceptOffer, declineOffer service functions

**Files:**
- Modify: `server/src/findbolig-service.ts`

- [ ] **Step 1: Add getActiveOffers function**

Add import at top:
```typescript
import { mapOfferToDomain } from "~/lib/findbolig-domain";
```

Add after the existing `getUpcomingAppointments` function:

```typescript
/**
 * Fetches active (Published) offers with residence data eagerly loaded
 */
export async function getActiveOffers(cookies: string) {
  const offersPage = await fetchOffers(cookies);
  const publishedOffers = offersPage.results.filter(
    (offer) => offer.state === "Published",
  );

  const offersWithData = await Promise.all(
    publishedOffers.map(async (offer) => {
      if (!offer.residenceId || !offer.id) return null;
      try {
        const [residence, position] = await Promise.all([
          getResidence(offer.residenceId, cookies),
          getPositionOnOffer(offer.id, cookies).catch(() => null),
        ]);
        return mapOfferToDomain({ offer, residence, position });
      } catch (error) {
        console.error(`Failed to load residence for offer ${offer.id}:`, error);
        return null;
      }
    }),
  );

  return offersWithData.filter((o): o is NonNullable<typeof o> => o !== null);
}
```

- [ ] **Step 2: Add acceptOffer function**

```typescript
/**
 * Accepts an offer on findbolig.nu
 */
export async function acceptOffer(offerId: string, cookies: string) {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/data/offers/${offerId}/accept`,
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
    throw new UpstreamHttpError(`Failed to accept offer: ${res.status}`, res.status);
  }

  return (await res.json()) as ApiOffer;
}
```

- [ ] **Step 3: Add declineOffer function**

```typescript
/**
 * Declines an offer on findbolig.nu
 */
export async function declineOffer(offerId: string, cookies: string) {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/data/offers/${offerId}/decline`,
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
    throw new UpstreamHttpError(`Failed to decline offer: ${res.status}`, res.status);
  }

  return (await res.json()) as ApiOffer;
}
```

- [ ] **Step 4: Add ApiOffer import for return types**

Ensure `ApiOffer` is imported at the top of `findbolig-service.ts` (it already should be via `ApiOffersPage`). The `mapOfferToDomain` import was added in step 1.

- [ ] **Step 5: Commit**

```bash
git add server/src/findbolig-service.ts
git commit -m "feat(offers): add getActiveOffers, acceptOffer, declineOffer services"
```

---

### Task 5: Add API routes for offers

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add GET /offers/active route**

In `server/src/index.ts`, after the existing `offers.get("/:offerId/position", ...)` handler (around line 177), add:

```typescript
offers.get("/active", async (c) => {
  try {
    const result = await withReauth(c, (cookies) =>
      findboligService.getActiveOffers(cookies)
    );
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});
```

**Important:** This route MUST be defined before `offers.get("/:offerId/position", ...)` in the source file. If placed after, the `:offerId` param route would match "active" as a parameter value. Insert it immediately after the existing `offers.get("/", ...)` handler.

- [ ] **Step 2: Add POST /offers/:offerId/accept route**

```typescript
offers.post("/:offerId/accept", async (c) => {
  try {
    const offerId = c.req.param("offerId");
    if (!offerId) return c.json({ error: "Offer ID is required" }, 400);
    const result = await withReauth(c, (cookies) =>
      findboligService.acceptOffer(offerId, cookies)
    );
    const recipientState = result.recipients?.[0]?.state ?? "OfferAccepted";
    return c.json({ recipientState });
  } catch (error) {
    return handleError(c, error);
  }
});
```

- [ ] **Step 3: Add POST /offers/:offerId/decline route**

```typescript
offers.post("/:offerId/decline", async (c) => {
  try {
    const offerId = c.req.param("offerId");
    if (!offerId) return c.json({ error: "Offer ID is required" }, 400);
    const result = await withReauth(c, (cookies) =>
      findboligService.declineOffer(offerId, cookies)
    );
    const recipientState = result.recipients?.[0]?.state ?? "OfferDeclined";
    return c.json({ recipientState });
  } catch (error) {
    return handleError(c, error);
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(offers): add active offers, accept, decline API routes"
```

---

## Chunk 2: Frontend — Data Layer, Store, Utilities

### Task 6: Add i18n translations for offers

**Files:**
- Modify: `client/src/i18n/locales/da.json`
- Modify: `client/src/i18n/locales/en.json`

- [ ] **Step 1: Add Danish translations**

Add after the `"appointments"` section in `da.json`:

```json
"offers": {
  "pageTitle": "Boligtilbud",
  "count": "{count} tilbud | {count} tilbud",
  "awaitingResponse": "Afventer svar",
  "accepted": "Accepteret",
  "accept": "Acceptér",
  "decline": "Afvis",
  "undoAccept": "Fortryd accept",
  "declined": "Afvist",
  "deadline": "Svarfrist",
  "noDeadline": "Ingen frist",
  "availableFrom": "Ledig fra",
  "today": "i dag",
  "tomorrow": "i morgen",
  "daysRemaining": "{count} dage",
  "confirmAcceptTitle": "Acceptér boligtilbud?",
  "confirmDeclineTitle": "Afvis boligtilbud?",
  "confirmAcceptBody": "Ved at acceptere bekræfter du din interesse i",
  "confirmDeclineBody": "Er du sikker på, at du vil afvise tilbuddet på",
  "confirmNote": "Du kan ændre dit svar indtil svarfristen udløber",
  "confirm": "Bekræft",
  "cancel": "Annuller",
  "name": "Navn",
  "email": "Email",
  "acceptSuccess": "Tilbud accepteret",
  "declineSuccess": "Tilbud afvist",
  "actionFailed": "Handling mislykkedes. Prøv igen.",
  "emptyTitle": "Ingen nye tilbud",
  "emptyDescription": "Du har ingen aktive boligtilbud i øjeblikket. Tilbud vises her, når du modtager dem på FindBolig.nu.",
  "openOnFindbolig": "Åbn på findbolig.nu",
  "queuePosition": "Placering",
  "mapOfLocations": "Kort over {count} lokationer",
  "respondBefore": "Ønsker du at komme i betragtning?"
},
```

- [ ] **Step 2: Add English translations**

Add after the `"appointments"` section in `en.json`:

```json
"offers": {
  "pageTitle": "Housing Offers",
  "count": "{count} offer | {count} offers",
  "awaitingResponse": "Awaiting response",
  "accepted": "Accepted",
  "accept": "Accept",
  "decline": "Decline",
  "undoAccept": "Undo accept",
  "declined": "Declined",
  "deadline": "Deadline",
  "noDeadline": "No deadline",
  "availableFrom": "Available from",
  "today": "today",
  "tomorrow": "tomorrow",
  "daysRemaining": "{count} days",
  "confirmAcceptTitle": "Accept housing offer?",
  "confirmDeclineTitle": "Decline housing offer?",
  "confirmAcceptBody": "By accepting, you confirm your interest in",
  "confirmDeclineBody": "Are you sure you want to decline the offer for",
  "confirmNote": "You can change your response until the deadline expires",
  "confirm": "Confirm",
  "cancel": "Cancel",
  "name": "Name",
  "email": "Email",
  "acceptSuccess": "Offer accepted",
  "declineSuccess": "Offer declined",
  "actionFailed": "Action failed. Please try again.",
  "emptyTitle": "No new offers",
  "emptyDescription": "You don't have any active housing offers right now. Offers will appear here when you receive them on FindBolig.nu.",
  "openOnFindbolig": "Open on findbolig.nu",
  "queuePosition": "Position",
  "mapOfLocations": "Map of {count} locations",
  "respondBefore": "Would you like to be considered?"
},
```

- [ ] **Step 3: Commit**

```bash
git add client/src/i18n/locales/da.json client/src/i18n/locales/en.json
git commit -m "feat(offers): add i18n translations for offers feature"
```

---

### Task 7: Add offersSource.ts API layer

**Files:**
- Create: `client/src/data/offersSource.ts`

- [ ] **Step 1: Create offersSource.ts**

Reuses `HttpError` and `fetchWithTimeout` from `appointmentsSource.ts` to avoid duplicate class definitions (which break `instanceof` checks).

```typescript
import type { Offer, RecipientState } from "@/types";
import { MOCK_OFFERS } from "./mockData";
import { HttpError } from "./appointmentsSource";
import config from "~/config";

const TIMEOUT_FETCH = 90_000;
const TIMEOUT_ACTION = 25_000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function fetchActiveOffers(): Promise<{
  updatedAt: Date;
  offers: Offer[];
}> {
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { updatedAt: new Date(), offers: MOCK_OFFERS };
  }

  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/offers/active`,
    { method: "GET", credentials: "include" },
    TIMEOUT_FETCH,
  );

  if (!res.ok) {
    throw new HttpError(`Failed to fetch offers: ${res.status}`, res.status);
  }

  const data = await res.json();
  return { updatedAt: new Date(), offers: data as Offer[] };
}

export async function acceptOffer(offerId: string): Promise<RecipientState> {
  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/offers/${offerId}/accept`,
    { method: "POST", credentials: "include" },
    TIMEOUT_ACTION,
  );

  if (!res.ok) {
    throw new HttpError(`Failed to accept offer: ${res.status}`, res.status);
  }

  const data = await res.json();
  return data.recipientState as RecipientState;
}

export async function declineOffer(offerId: string): Promise<RecipientState> {
  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/offers/${offerId}/decline`,
    { method: "POST", credentials: "include" },
    TIMEOUT_ACTION,
  );

  if (!res.ok) {
    throw new HttpError(`Failed to decline offer: ${res.status}`, res.status);
  }

  const data = await res.json();
  return data.recipientState as RecipientState;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/data/offersSource.ts
git commit -m "feat(offers): add offersSource API layer"
```

---

### Task 8: Add offers cache layer

**Files:**
- Create: `client/src/data/offers.ts`

- [ ] **Step 1: Create offers.ts**

Follow same pattern as `client/src/data/appointments.ts`:

```typescript
import type { Offer } from "@/types";
import { useToastStore } from "~/stores/toast";
import { fetchActiveOffers } from "./offersSource";

const STORAGE_KEY = "offers_cache";

export function getOffersCacheAge(): number | null {
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

export function isOffersCacheStale(thresholdMs = 24 * 60 * 60 * 1000): boolean {
  const age = getOffersCacheAge();
  if (age === null) return false;
  return age > thresholdMs;
}

export async function getOffers(forceRefresh: boolean = false) {
  if (!forceRefresh) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          updatedAt: new Date(parsed.updatedAt),
          offers: parsed.offers as Offer[],
        };
      } catch {
        const toast = useToastStore();
        toast.warning("Failed to load cached data, fetching fresh data...");
      }
    }
  }

  const payload = await fetchActiveOffers();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/data/offers.ts
git commit -m "feat(offers): add offers cache layer"
```

---

### Task 9: Add mock offers data

**Files:**
- Modify: `client/src/data/mockData.ts`

- [ ] **Step 1: Add MOCK_OFFERS to mockData.ts**

Add import at top:
```typescript
import type { Offer } from "@/types";
```

Add after the `MOCK_DEAS_APPOINTMENTS` array:

```typescript
export const MOCK_OFFERS: Offer[] = [
  {
    id: "cc687d34-4ed5-4beb-b3b8-08de747fab9e",
    residence: {
      adressLine1: "Philip Schous Vej 21, 3. TH.",
      adressLine2: "2000 Frederiksberg",
      location: { latitude: 55.68095, longitude: 12.52475 },
    },
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T00:00:00Z",
    availableFrom: "2026-04-01T00:00:00Z",
    recipientState: "OfferReceived",
    company: "PFA (Capital Investment)",
    financials: {
      monthlyRentIncludingAconto: 12564,
      monthlyRentExcludingAconto: 11564,
      utilityCosts: 1000,
      deposit: 37032,
      prepaidRent: 37032,
      firstPayment: 87628,
    },
    imageUrl: "/data/media/a6a99bfb-ef48-4de0-8462-a21739c7f1e6/4a495ae4-da44-4f65-827b-f51463d67111.jpg",
    images: [
      "/data/media/a6a99bfb-ef48-4de0-8462-a21739c7f1e6/4a495ae4-da44-4f65-827b-f51463d67111.jpg",
      "/data/media/a6a99bfb-ef48-4de0-8462-a21739c7f1e6/1f611538-1a1f-4b51-ae27-6ba37c784a23.jpg",
      "/data/media/a6a99bfb-ef48-4de0-8462-a21739c7f1e6/0675e7db-0238-4331-9469-837765896653.jpg",
    ],
    blueprints: ["/data/media/a6a99bfb-ef48-4de0-8462-a21739c7f1e6/083a47c9-fb38-4e3b-9da0-ab7d097c86cf.png"],
    position: 36,
  },
  {
    id: "dd787e45-5fe6-5cfc-c4c9-19ef858gbc0f",
    residence: {
      adressLine1: "Nitivej 13, 1 th",
      adressLine2: "2000 Frederiksberg",
      location: { latitude: 55.67892, longitude: 12.51234 },
    },
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T00:00:00Z",
    availableFrom: "2026-05-01T00:00:00Z",
    recipientState: "OfferReceived",
    company: "PFA (Capital Investment)",
    financials: {
      monthlyRentIncludingAconto: 9800,
      monthlyRentExcludingAconto: 8800,
      utilityCosts: 1000,
      deposit: 26400,
      prepaidRent: 26400,
      firstPayment: 63600,
    },
    imageUrl: "/data/media/d7e91ff6-3b48-4e79-8e96-df0c710f7898/a0203081-cfb0-485e-8f5e-d0e2cb4df99f.jpg",
    images: [
      "/data/media/d7e91ff6-3b48-4e79-8e96-df0c710f7898/a0203081-cfb0-485e-8f5e-d0e2cb4df99f.jpg",
      "/data/media/d7e91ff6-3b48-4e79-8e96-df0c710f7898/76019d7c-d1b5-41b3-be2b-63b66962c512.jpg",
    ],
    blueprints: [],
    position: 12,
  },
  {
    id: "ee898f56-6gf7-6dgd-d5da-20fg969hcd1g",
    residence: {
      adressLine1: "Mariendalsvej 52G, 2. TV",
      adressLine2: "2000 Frederiksberg",
      location: { latitude: 55.69138, longitude: 12.5318 },
    },
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T00:00:00Z",
    availableFrom: "2026-06-01T00:00:00Z",
    recipientState: "OfferAccepted",
    company: "DEAS",
    financials: {
      monthlyRentIncludingAconto: 10799,
      monthlyRentExcludingAconto: 9799,
      utilityCosts: 1000,
      deposit: 29397,
      prepaidRent: 29397,
      firstPayment: 69593,
    },
    imageUrl: "/data/media/d7e91ff6-3b48-4e79-8e96-df0c710f7898/03e6da45-21d3-432f-a32c-efba4e33f465.jpg",
    images: [
      "/data/media/d7e91ff6-3b48-4e79-8e96-df0c710f7898/03e6da45-21d3-432f-a32c-efba4e33f465.jpg",
    ],
    blueprints: [],
    position: 8,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add client/src/data/mockData.ts
git commit -m "feat(offers): add mock offers for demo mode"
```

---

### Task 10: Add deadline urgency utility

**Files:**
- Create: `client/src/lib/deadlineUrgency.ts`

- [ ] **Step 1: Create deadlineUrgency.ts**

```typescript
export type UrgencyColor = "red" | "amber" | "green" | "neutral";

export type DeadlineUrgency = {
  color: UrgencyColor;
  relative: string;
};

/**
 * Returns urgency level and relative time string for an offer deadline.
 * Uses Danish locale strings — i18n keys are used by the component instead.
 */
export function getDeadlineUrgency(
  deadline: string | null,
  t: (key: string, params?: Record<string, unknown>) => string,
): DeadlineUrgency {
  if (!deadline) {
    return { color: "neutral", relative: t("offers.noDeadline") };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { color: "red", relative: t("offers.today") };
  }
  if (diffDays === 1) {
    return { color: "red", relative: t("offers.tomorrow") };
  }
  if (diffDays <= 5) {
    return { color: "amber", relative: t("offers.daysRemaining", { count: diffDays }) };
  }
  return { color: "green", relative: t("offers.daysRemaining", { count: diffDays }) };
}

/** Tailwind color classes for urgency indicators */
export const urgencyColors: Record<UrgencyColor, { dot: string; text: string }> = {
  red: { dot: "bg-red-500", text: "text-red-500" },
  amber: { dot: "bg-amber-500", text: "text-amber-500" },
  green: { dot: "bg-emerald-500", text: "text-emerald-500" },
  neutral: { dot: "bg-neutral-400", text: "text-neutral-400" },
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/deadlineUrgency.ts
git commit -m "feat(offers): add deadline urgency utility"
```

---

### Task 11: Add useGroupOffers composable

**Files:**
- Create: `client/src/composables/useGroupOffers.ts`

- [ ] **Step 1: Create useGroupOffers.ts**

```typescript
import type { Offer } from "@/types";
import { computed, type Ref } from "vue";

export type GroupedOffers = { key: string; label: string; offers: Offer[]; isFirst: boolean }[];

export function useGroupOffers(offers: Ref<Offer[]>, t: (key: string) => string) {
  const groupedOffers = computed<GroupedOffers>(() => {
    const awaiting = offers.value
      .filter((o) => o.recipientState === "OfferReceived")
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

    const accepted = offers.value
      .filter((o) => o.recipientState === "OfferAccepted")
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

    const groups: GroupedOffers = [];

    if (awaiting.length > 0) {
      groups.push({
        key: "awaiting",
        label: t("offers.awaitingResponse"),
        offers: awaiting,
        isFirst: true,
      });
    }

    if (accepted.length > 0) {
      groups.push({
        key: "accepted",
        label: t("offers.accepted"),
        offers: accepted,
        isFirst: groups.length === 0,
      });
    }

    return groups;
  });

  return { groupedOffers };
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/composables/useGroupOffers.ts
git commit -m "feat(offers): add useGroupOffers composable"
```

---

### Task 12: Add offers Pinia store

**Files:**
- Create: `client/src/stores/offers.ts`

- [ ] **Step 1: Create offers.ts store**

```typescript
import type { Offer, RecipientState } from "@/types";
import { defineStore, storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { getOffers, isOffersCacheStale } from "~/data/offers";
import { acceptOffer as apiAcceptOffer, declineOffer as apiDeclineOffer } from "~/data/offersSource";
import { handleApiError } from "~/data/appointmentsSource";
import { useAuth } from "~/composables/useAuth";
import { useToastStore } from "~/stores/toast";
import { useI18n } from "~/i18n";
import config from "~/config";
import { MOCK_OFFERS } from "~/data/mockData";

export const useOffersStore = defineStore("offers", () => {
  const offers = ref<Offer[]>([]);
  const updatedAt = ref<Date | null>(null);
  const isLoading = ref(false);
  const needsRefresh = ref(false);
  const sessionExpired = ref(false);
  const isActioning = ref(false);

  async function init() {
    const auth = useAuth();

    if (auth.isDemo) {
      isLoading.value = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      offers.value = MOCK_OFFERS;
      updatedAt.value = new Date();
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    try {
      const cached = await getOffers(false);
      offers.value = cached.offers;
      updatedAt.value = cached.updatedAt;

      if (!auth.isAuthenticated) {
        sessionExpired.value = true;
        return;
      }

      if (isOffersCacheStale()) {
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
        const payload = await getOffers(true);
        offers.value = payload.offers;
        updatedAt.value = payload.updatedAt;
      } catch (error) {
        handleApiError(error, useToastStore(), useI18n().t, "Failed to load offers");
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function refresh() {
    isLoading.value = true;
    needsRefresh.value = false;
    const auth = useAuth();

    if (auth.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      offers.value = MOCK_OFFERS;
      updatedAt.value = new Date();
      isLoading.value = false;
      return;
    }

    try {
      const payload = await getOffers(true);
      offers.value = payload.offers;
      updatedAt.value = payload.updatedAt;
    } catch (error) {
      const is401 = error instanceof Error && error.message.includes("401");
      if (is401) {
        const recovered = await auth.ensureSession();
        if (recovered) {
          try {
            const payload = await getOffers(true);
            offers.value = payload.offers;
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
      handleApiError(error, useToastStore(), useI18n().t, "Failed to refresh offers");
    } finally {
      isLoading.value = false;
    }
  }

  async function acceptOffer(offerId: string): Promise<boolean> {
    const toast = useToastStore();
    const { t } = useI18n();
    isActioning.value = true;
    try {
      const newState = await apiAcceptOffer(offerId);
      updateLocalOfferState(offerId, newState);
      toast.success(t("offers.acceptSuccess"));
      return true;
    } catch (error) {
      handleApiError(error, toast, t, t("offers.actionFailed"));
      return false;
    } finally {
      isActioning.value = false;
    }
  }

  async function declineOffer(offerId: string): Promise<boolean> {
    const toast = useToastStore();
    const { t } = useI18n();
    isActioning.value = true;
    try {
      const newState = await apiDeclineOffer(offerId);
      updateLocalOfferState(offerId, newState);
      toast.success(t("offers.declineSuccess"));
      return true;
    } catch (error) {
      handleApiError(error, toast, t, t("offers.actionFailed"));
      return false;
    } finally {
      isActioning.value = false;
    }
  }

  function updateLocalOfferState(offerId: string, newState: RecipientState) {
    const offer = offers.value.find((o) => o.id === offerId);
    if (offer) {
      offer.recipientState = newState;
    }
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

  function getImageUrl(imagePath: string): string {
    return `${config.imageBaseUrl}${imagePath}`;
  }

  return {
    offers,
    updatedAt,
    isLoading,
    needsRefresh,
    sessionExpired,
    isActioning,
    init,
    refresh,
    handleRefresh,
    acceptOffer,
    declineOffer,
    getImageUrl,
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add client/src/stores/offers.ts
git commit -m "feat(offers): add offers Pinia store with accept/decline"
```

---

## Chunk 3: Frontend — UI Components

### Task 13: Refactor ImageGalleryModal to accept getImageUrl as prop

**Files:**
- Modify: `client/src/components/appointment/gallery/ImageGalleryModal.vue`
- Modify: `client/src/components/appointment/detail/AppointmentDetailSheet.vue`

Currently `ImageGalleryModal` hardcodes `useAppointmentsStore().getImageUrl`. We need it to work for offers too.

- [ ] **Step 1: Add getImageUrl prop to ImageGalleryModal**

In `client/src/components/appointment/gallery/ImageGalleryModal.vue`:

Replace the import and usage:
```typescript
// Remove this line:
import { useAppointmentsStore } from "~/stores/appointments";
// Remove this line:
const { getImageUrl } = useAppointmentsStore();
```

Add `getImageUrl` to props:
```typescript
const props = defineProps<{
  images: string[];
  blueprints?: string[];
  initialIndex?: number;
  getImageUrl: (path: string) => string;
}>();
```

Update `resolveUrl` to use `props.getImageUrl`:
```typescript
function resolveUrl(path: string): string {
  const transform = activeTab.value === "blueprints" ? blueprintImage : galleryImage;
  return transform(props.getImageUrl(path));
}
```

- [ ] **Step 2: Update AppointmentDetailSheet to pass getImageUrl**

In `client/src/components/appointment/detail/AppointmentDetailSheet.vue`, update the `ImageGalleryModal` usage (around line 417):

```vue
<ImageGalleryModal
  v-if="showGallery"
  :images="allImages"
  :blueprints="appointment.blueprints ?? []"
  :initial-index="galleryActiveIndex"
  :get-image-url="getImageUrl"
  @close="onGalleryClose"
/>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/appointment/gallery/ImageGalleryModal.vue client/src/components/appointment/detail/AppointmentDetailSheet.vue
git commit -m "refactor: make ImageGalleryModal accept getImageUrl as prop"
```

---

### Task 14: Create OfferCard.vue

**Files:**
- Create: `client/src/components/offer/card/OfferCard.vue`

- [ ] **Step 1: Create OfferCard.vue**

Based on `client/src/components/appointment/card/CompactCard.vue`:

```vue
<script setup lang="ts">
import type { Offer } from "@/types";
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useOffersStore } from "~/stores/offers";
import { compactThumb } from "~/lib/imageTransform";
import { formatCurrency } from "~/lib/formatters";
import { getDeadlineUrgency, urgencyColors } from "~/lib/deadlineUrgency";
import OfferDetailSheet from "../detail/OfferDetailSheet.vue";

const { t } = useI18n();
const { getImageUrl } = useOffersStore();

const props = defineProps<{
  offer: Offer;
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
  return compactThumb(getImageUrl(props.offer.imageUrl));
});

const urgency = computed(() => getDeadlineUrgency(props.offer.deadline, t));
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
          :alt="offer.residence.adressLine1 ?? ''"
          class="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
      </div>

      <!-- Text content -->
      <div class="flex flex-col justify-between min-w-0 flex-1 py-0.5">
        <div class="min-w-0">
          <p class="font-semibold text-[0.8125rem] leading-snug truncate dark:text-neutral-100">
            {{ offer.residence.adressLine1 }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {{ offer.residence.adressLine2 }}
          </p>
        </div>

        <div class="flex items-end justify-between gap-2 mt-auto">
          <div class="min-w-0">
            <div class="flex items-center gap-1">
              <span
                class="inline-block w-1.5 h-1.5 rounded-full"
                :class="urgencyColors[urgency.color].dot"
              />
              <p
                class="text-[0.625rem] font-medium"
                :class="urgencyColors[urgency.color].text"
              >
                {{ t("offers.deadline") }}: {{ urgency.relative }}
              </p>
            </div>
            <p class="text-[0.8125rem] font-medium tabular-nums dark:text-neutral-200">
              {{ formatCurrency(offer.financials.monthlyRentIncludingAconto) }} / {{ t("financials.shortMonth") }}
            </p>
          </div>

          <span
            v-if="offer.position != null"
            class="text-base font-bold tabular-nums text-neutral-300 dark:text-neutral-600 shrink-0"
          >
            #{{ offer.position }}
          </span>
        </div>
      </div>
    </div>

    <OfferDetailSheet
      v-if="detailMounted"
      :offer="offer"
      @close="onDetailClose"
      @after-leave="onDetailAfterLeave"
    />
  </li>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/offer/card/OfferCard.vue
git commit -m "feat(offers): add OfferCard compact card component"
```

---

### Task 15: Create ConfirmActionDialog.vue

**Files:**
- Create: `client/src/components/offer/detail/ConfirmActionDialog.vue`

- [ ] **Step 1: Create ConfirmActionDialog.vue**

```vue
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAuth } from "~/composables/useAuth";
import { useScrollLock } from "~/composables/useScrollLock";

const { t } = useI18n();
const auth = useAuth();
useScrollLock();

const props = defineProps<{
  action: "accept" | "decline";
  address: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const title = props.action === "accept"
  ? t("offers.confirmAcceptTitle")
  : t("offers.confirmDeclineTitle");

const body = props.action === "accept"
  ? t("offers.confirmAcceptBody")
  : t("offers.confirmDeclineBody");
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
          <div class="text-3xl mb-3">{{ action === "accept" ? "✓" : "✕" }}</div>
          <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
            {{ title }}
          </h3>
          <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {{ body }}
            <strong class="block mt-1 text-neutral-700 dark:text-neutral-200">{{ address }}</strong>
          </p>

          <!-- User details -->
          <div class="mt-4 text-left p-3 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/50 dark:border-white/5 text-sm">
            <div class="flex justify-between py-1 border-b border-neutral-200/50 dark:border-white/5">
              <span class="text-neutral-500 dark:text-neutral-500 font-medium">{{ t("offers.name") }}</span>
              <span class="text-neutral-700 dark:text-neutral-300">{{ auth.name }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-neutral-500 dark:text-neutral-500 font-medium">{{ t("offers.email") }}</span>
              <span class="text-neutral-700 dark:text-neutral-300">{{ auth.email }}</span>
            </div>
          </div>

          <p class="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
            {{ t("offers.confirmNote") }}
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
              {{ t("offers.cancel") }}
            </button>
            <button
              class="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-colors"
              :class="action === 'accept'
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-red-500 hover:bg-red-600'"
              :disabled="isLoading"
              @click="emit('confirm')"
            >
              <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span v-else>{{ t("offers.confirm") }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/offer/detail/ConfirmActionDialog.vue
git commit -m "feat(offers): add ConfirmActionDialog component"
```

---

### Task 16: Create OfferDetailSheet.vue

**Files:**
- Create: `client/src/components/offer/detail/OfferDetailSheet.vue`

- [ ] **Step 1: Create OfferDetailSheet.vue**

Based on `client/src/components/appointment/detail/AppointmentDetailSheet.vue`. The key differences: replaces the open house date/calendar section with deadline + accept/decline actions.

```vue
<script setup lang="ts">
import type { Offer } from "@/types";
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useDarkMode } from "~/composables/useDarkMode";
import { useScrollLock } from "~/composables/useScrollLock";
import { formatCurrency } from "~/lib/formatters";
import { getDeadlineUrgency, urgencyColors } from "~/lib/deadlineUrgency";
import { galleryImage } from "~/lib/imageTransform";
import { useOffersStore } from "~/stores/offers";
import ImageGalleryModal from "~/components/appointment/gallery/ImageGalleryModal.vue";
import FinancialsModal from "~/components/appointment/card/FinancialsModal.vue";
import ConfirmActionDialog from "./ConfirmActionDialog.vue";

const { t } = useI18n();
const { isDark } = useDarkMode();
useScrollLock();
const store = useOffersStore();
const { getImageUrl } = store;

const props = defineProps<{
  offer: Offer;
}>();

const emit = defineEmits<{
  close: [];
  "after-leave": [];
}>();

const visible = ref(false);
const showGallery = ref(false);
const showFinancials = ref(false);
const confirmAction = ref<"accept" | "decline" | null>(null);
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

const allImages = computed(() => {
  if (props.offer.images?.length) return props.offer.images;
  return props.offer.imageUrl ? [props.offer.imageUrl] : [];
});

const urgency = computed(() => getDeadlineUrgency(props.offer.deadline, t));

const availableFromFormatted = computed(() => {
  if (!props.offer.availableFrom) return null;
  return new Date(props.offer.availableFrom).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

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

function openFinancials() {
  showFinancials.value = true;
  history.pushState({ sheet: true, financials: true }, "");
}

function onGalleryClose() {
  showGallery.value = false;
  history.back();
}

function onFinancialsClose() {
  showFinancials.value = false;
  history.back();
}

function handleMapClick() {
  const address = `${props.offer.residence.adressLine1}, ${props.offer.residence.adressLine2}`;
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    "_blank",
  );
}

function openOnFindbolig() {
  window.open(
    `https://findbolig.nu/profile/my-offers?offerId=${props.offer.id}`,
    "_blank",
  );
}

function promptAction(action: "accept" | "decline") {
  confirmAction.value = action;
}

async function handleConfirm() {
  if (!confirmAction.value) return;
  const success = confirmAction.value === "accept"
    ? await store.acceptOffer(props.offer.id)
    : await store.declineOffer(props.offer.id);

  if (success) {
    confirmAction.value = null;
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
  if (e.key === "Escape" && !showGallery.value && !showFinancials.value && !confirmAction.value) close();
}

function onPopState(event: PopStateEvent) {
  if (showGallery.value) { showGallery.value = false; return; }
  if (showFinancials.value) { showFinancials.value = false; return; }
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
          class="absolute top-3 right-3 z-10 p-1.5 rounded-full
                 bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20
                 transition-colors"
          aria-label="Close"
          @click="close"
        >
          <img src="/icons/x.svg" alt="" class="size-4 invert" />
        </button>

        <!-- Scrollable content -->
        <div class="overflow-y-auto overscroll-contain flex-1">
          <!-- Image gallery -->
          <div v-if="allImages.length > 0" class="relative cursor-pointer" @pointerdown="onGalleryPointerDown" @click="openGallery">
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
              class="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-full
                     bg-black/40 backdrop-blur-sm text-white text-xs tabular-nums pointer-events-none"
            >
              {{ allImages.length }} {{ t("gallery.photos").toLowerCase() }}
            </div>
          </div>

          <!-- Content -->
          <div class="p-5 space-y-5">
            <!-- Address -->
            <div>
              <h2 class="text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                {{ offer.residence.adressLine1 }}
              </h2>
              <button class="flex items-center gap-1.5 mt-1.5 group" @click="handleMapClick">
                <p class="text-sm text-neutral-500 dark:text-neutral-400
                           group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                  {{ offer.residence.adressLine2 }}
                </p>
                <img src="/icons/map.svg" alt="" class="size-4 opacity-40 group-hover:opacity-70 transition-opacity dark:invert" />
              </button>
              <p v-if="offer.company" class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                {{ offer.company }}
              </p>
            </div>

            <hr class="border-neutral-200 dark:border-neutral-700/50" />

            <!-- Deadline + Queue -->
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                  {{ t("offers.deadline") }}
                </p>
                <div class="flex items-center gap-1.5">
                  <span class="inline-block w-2 h-2 rounded-full" :class="urgencyColors[urgency.color].dot" />
                  <p class="text-sm font-medium" :class="urgencyColors[urgency.color].text">
                    {{ offer.deadline ? new Date(offer.deadline).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }) : t("offers.noDeadline") }}
                  </p>
                </div>
                <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                  {{ urgency.relative }}
                </p>
              </div>

              <div v-if="offer.position != null" class="text-right shrink-0">
                <p class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                  {{ t("offers.queuePosition") }}
                </p>
                <p class="text-2xl font-bold tabular-nums text-neutral-800 dark:text-neutral-200">
                  #{{ offer.position }}
                </p>
              </div>
            </div>

            <!-- Available from -->
            <div v-if="availableFromFormatted">
              <p class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
                {{ t("offers.availableFrom") }}
              </p>
              <p class="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {{ availableFromFormatted }}
              </p>
            </div>

            <hr class="border-neutral-200 dark:border-neutral-700/50" />

            <!-- Financials summary -->
            <button
              class="w-full flex items-center justify-between p-3 rounded-xl
                     bg-neutral-100 dark:bg-white/5
                     hover:bg-neutral-200/70 dark:hover:bg-white/8
                     transition-colors text-left"
              @click="openFinancials"
            >
              <div>
                <p class="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-0.5">
                  {{ t("financials.rent") }}
                </p>
                <p class="text-base font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">
                  {{ formatCurrency(offer.financials.monthlyRentIncludingAconto) }} / {{ t("financials.shortMonth") }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">
                  {{ t("financials.firstPayment") }}
                </p>
                <p class="text-sm font-medium tabular-nums text-neutral-700 dark:text-neutral-200">
                  {{ formatCurrency(offer.financials.firstPayment) }}
                </p>
              </div>
              <img src="/icons/chevron-down.svg" alt="" class="size-4 -rotate-90 opacity-30 dark:invert shrink-0 ml-2" />
            </button>

            <hr class="border-neutral-200 dark:border-neutral-700/50" />

            <!-- Action area -->
            <div>
              <p class="text-xs text-center text-neutral-500 dark:text-neutral-400 mb-3">
                {{ t("offers.respondBefore") }}
              </p>

              <!-- OfferReceived: Accept + Decline -->
              <div v-if="offer.recipientState === 'OfferReceived'" class="flex gap-3">
                <button
                  class="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
                  @click="promptAction('accept')"
                >
                  {{ t("offers.accept") }}
                </button>
                <button
                  class="flex-1 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/50
                         text-neutral-500 dark:text-neutral-400 font-semibold
                         hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                  @click="promptAction('decline')"
                >
                  {{ t("offers.decline") }}
                </button>
              </div>

              <!-- OfferAccepted: Undo (decline) -->
              <div v-else-if="offer.recipientState === 'OfferAccepted'" class="flex gap-3">
                <button
                  class="flex-1 py-3.5 rounded-xl border border-amber-400/50
                         text-amber-600 dark:text-amber-400 font-semibold
                         hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                  @click="promptAction('decline')"
                >
                  {{ t("offers.undoAccept") }}
                </button>
                <div class="flex-1 py-3.5 rounded-xl bg-emerald-500/10 text-center">
                  <span class="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {{ t("offers.accepted") }}
                  </span>
                </div>
              </div>

              <!-- OfferDeclined: Accept again -->
              <div v-else-if="offer.recipientState === 'OfferDeclined'" class="flex gap-3">
                <button
                  class="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
                  @click="promptAction('accept')"
                >
                  {{ t("offers.accept") }}
                </button>
                <div class="flex-1 py-3.5 rounded-xl bg-neutral-100 dark:bg-white/5 text-center">
                  <span class="text-sm text-neutral-400 dark:text-neutral-500 font-medium">
                    {{ t("offers.declined") }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Open on findbolig -->
            <button
              class="w-full flex items-center justify-center gap-2 p-3 rounded-xl
                     border border-neutral-200 dark:border-neutral-700/50
                     hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
              @click="openOnFindbolig"
            >
              <img src="/icons/external-link.svg" alt="" class="size-4 opacity-50 dark:invert" />
              <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {{ t("offers.openOnFindbolig") }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Gallery modal -->
    <ImageGalleryModal
      v-if="showGallery"
      :images="allImages"
      :blueprints="offer.blueprints ?? []"
      :initial-index="galleryActiveIndex"
      :get-image-url="getImageUrl"
      @close="onGalleryClose"
    />

    <!-- Financials modal -->
    <FinancialsModal
      v-if="showFinancials"
      :financials="offer.financials"
      @close="onFinancialsClose"
    />

    <!-- Confirm action dialog -->
    <ConfirmActionDialog
      v-if="confirmAction"
      :action="confirmAction"
      :address="`${offer.residence.adressLine1}, ${offer.residence.adressLine2}`"
      :is-loading="store.isActioning"
      @confirm="handleConfirm"
      @cancel="confirmAction = null"
    />
  </Teleport>
</template>

<style scoped>
.detail-swiper :deep(.swiper-pagination-bullet) {
  background: white;
  opacity: 0.5;
}
.detail-swiper :deep(.swiper-pagination-bullet-active) {
  opacity: 1;
}
.detail-swiper :deep(.swiper-button-next),
.detail-swiper :deep(.swiper-button-prev) {
  color: rgba(255, 255, 255, 0.7);
  --swiper-navigation-size: 18px;
}
.detail-swiper :deep(.swiper-button-next:hover),
.detail-swiper :deep(.swiper-button-prev:hover) {
  color: white;
}
@media (max-width: 639px) {
  .detail-swiper :deep(.swiper-button-next),
  .detail-swiper :deep(.swiper-button-prev) {
    display: none;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/offer/detail/OfferDetailSheet.vue
git commit -m "feat(offers): add OfferDetailSheet bottom sheet component"
```

---

### Task 17: Create OfferGroup.vue

**Files:**
- Create: `client/src/components/offer/OfferGroup.vue`

- [ ] **Step 1: Create OfferGroup.vue**

Based on `client/src/components/appointment/AppointmentGroup.vue`:

```vue
<script setup lang="ts">
import type { Offer } from "@/types";
import { ref, watch } from "vue";
import OfferCard from "./card/OfferCard.vue";
import BaseCollapse from "~/components/Base/BaseCollapse.vue";
import MapModal from "~/components/appointment/MapModal.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps<{
  groupKey: string;
  label: string;
  offers: Offer[];
  isFirst?: boolean;
  class?: string;
}>();

const showMap = ref(false);
const expanded = ref(props.isFirst ?? false);
const hasBeenExpanded = ref(expanded.value);

watch(expanded, (val) => {
  if (val) hasBeenExpanded.value = true;
});

function toggleExpanded() {
  expanded.value = !expanded.value;
}

// Adapt offers to the shape MapModal expects (it uses Appointment[] with residence.location)
const mapItems = props.offers.map((o) => ({
  id: o.id,
  residence: o.residence,
  title: o.residence.adressLine1 ?? "",
}));
</script>

<template>
  <li :class="props.class">
    <!-- Group header -->
    <div class="flex items-center justify-between cursor-pointer" @click="toggleExpanded">
      <div class="flex items-center gap-2">
        <h2 class="text-[clamp(0.95rem,3vw,1.125rem)] font-semibold pl-1">{{ label }}</h2>
        <span v-if="!expanded"
          class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full dark:bg-white/15 bg-neutral-400/30 dark:text-neutral-300 text-neutral-600">
          {{ props.offers.length }}
        </span>
      </div>
      <img src="/icons/chevron-down.svg" alt="Expand/Collapse"
        class="size-5 dark:invert opacity-70 transition-transform duration-200" :class="{ '-rotate-90': !expanded }" />
    </div>

    <!-- Inner loop -->
    <BaseCollapse v-model:expanded="expanded">
      <hr class="dark:border-zinc-50/25 m-1" />
      <div v-if="props.offers.length > 1" class="flex flex-col items-center p-1" @click="showMap = true">
        <div
          class="flex flex-row items-center gap-1.5 border rounded-lg dark:border-zinc-50/25 dark:bg-white/5 bg-neutral-200 p-1.5 mb-2 cursor-pointer select-none hover:scale-[1.02] hover:bg-neutral-300 dark:hover:bg-white/10 active:scale-[0.98] transition-all duration-150">
          <p class="text-[clamp(0.8rem,2.5vw,0.925rem)] dark:text-white/50">{{ t('offers.mapOfLocations', { count: props.offers.length }) }}</p>
          <img src="/icons/map-pin.svg" alt="Map" class="size-5 dark:invert opacity-70" />
        </div>
      </div>
      <ul class="grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1">
        <OfferCard v-for="offer in props.offers" :key="offer.id" :offer="offer" :load-image="hasBeenExpanded" />
      </ul>
    </BaseCollapse>

    <MapModal v-if="showMap" :appointments="mapItems as any" @close="showMap = false" />
  </li>
</template>
```

Note: `MapModal` expects `Appointment[]` but we pass offer-shaped objects with the `residence` field it needs. The `as any` cast is pragmatic; a future refactor could make `MapModal` generic.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/offer/OfferGroup.vue
git commit -m "feat(offers): add OfferGroup collapsible list component"
```

---

### Task 18: Create OffersList.vue

**Files:**
- Create: `client/src/components/offer/OffersList.vue`

- [ ] **Step 1: Create OffersList.vue**

```vue
<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import OfferGroup from "~/components/offer/OfferGroup.vue";
import CompactCardSkeleton from "~/components/appointment/card/CompactCardSkeleton.vue";
import { useGroupOffers } from "~/composables/useGroupOffers";
import { useOffersStore } from "~/stores/offers";

const { t } = useI18n();
const store = useOffersStore();
const { offers, isLoading } = storeToRefs(store);
const { groupedOffers } = useGroupOffers(offers, t);
</script>

<template>
  <div>
    <!-- Skeleton loading state -->
    <div v-if="isLoading && !offers.length"
      class="w-full border rounded-xl p-2 dark:border-zinc-50/25 dark:bg-white/5 bg-neutral-200">
      <div class="h-5 w-28 rounded-md mb-2 ml-1 bg-neutral-300/40 dark:bg-white/10" />
      <ul class="grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1">
        <CompactCardSkeleton v-for="i in 3" :key="i" />
      </ul>
    </div>

    <!-- Loaded offers -->
    <ul v-else class="w-full space-y-2">
      <OfferGroup
        v-for="group in groupedOffers"
        :key="group.key"
        class="w-full border rounded-xl p-1 dark:border-zinc-50/25 dark:bg-white/5 bg-neutral-200"
        :group-key="group.key"
        :label="group.label"
        :offers="group.offers"
        :is-first="group.isFirst"
      />
    </ul>

    <!-- Empty state -->
    <div v-if="!isLoading && !offers.length" class="text-center py-12">
      <p class="text-lg font-semibold dark:text-white">{{ t("offers.emptyTitle") }}</p>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-sm mx-auto">
        {{ t("offers.emptyDescription") }}
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/offer/OffersList.vue
git commit -m "feat(offers): add OffersList container component"
```

---

## Chunk 4: Frontend — Page, Route, Navigation

### Task 19: Create OffersView.vue

**Files:**
- Create: `client/src/views/OffersView.vue`

- [ ] **Step 1: Create OffersView.vue**

Note: `StaleDataBanner` is hardcoded to `useAppointmentsStore` and cannot be reused here without refactoring. Skip it for now — offers are always fetched fresh on page load.

```vue
<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import OffersList from "~/components/offer/OffersList.vue";
import { useAuth } from "~/composables/useAuth";
import { getOffersCacheAge } from "~/data/offers";
import { useOffersStore } from "~/stores/offers";

const store = useOffersStore();
const auth = useAuth();
const router = useRouter();
const { t } = useI18n();

const offerCount = computed(() => store.offers.length);

onMounted(() => {
  const hasCache = getOffersCacheAge() !== null;
  if (!auth.isAuthenticated && !hasCache) {
    router.replace("/");
    return;
  }
  store.init();
});
</script>

<template>
  <div>
    <p class="mb-3 text-xl font-semibold tracking-tight dark:text-white flex items-baseline gap-2">
      {{ t("offers.pageTitle") }}
      <span v-if="offerCount > 0" class="text-xs font-normal text-neutral-400 dark:text-neutral-500">
        {{ t("offers.count", { count: offerCount }, offerCount) }}
      </span>
    </p>
    <OffersList />
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/OffersView.vue
git commit -m "feat(offers): add OffersView page"
```

---

### Task 20: Add /offers route

**Files:**
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: Add offers route**

Add between the `/appointments` and catch-all routes (after line 14):

```typescript
  {
    path: "/offers",
    name: "offers",
    component: () => import("~/views/OffersView.vue"),
  },
```

- [ ] **Step 2: Commit**

```bash
git add client/src/router/index.ts
git commit -m "feat(offers): add /offers route"
```

---

### Task 21: Update AppHeader navigation

**Files:**
- Modify: `client/src/components/AppHeader.vue`

- [ ] **Step 1: Add offers navigation link**

In `client/src/components/AppHeader.vue`, update the left nav section (lines 14-25). Replace the single icon toggle with a small nav that shows both appointments and offers:

```vue
    <div class="flex-1 flex justify-start gap-1">
      <router-link v-if="$route.path !== '/'" to="/" class="transition-colors">
        <img src="/icons/home.svg" alt="Home" class="size-7 dark:invert" />
      </router-link>
      <router-link v-if="$route.path !== '/appointments'" to="/appointments"
        class="transition-transform hover:scale-110">
        <img src="/icons/calendar-days.svg" alt="Appointments" class="size-7 dark:invert" />
      </router-link>
      <router-link v-if="$route.path !== '/offers'" to="/offers"
        class="transition-transform hover:scale-110">
        <img src="/icons/cloud-download.svg" alt="Offers" class="size-7 dark:invert" />
      </router-link>
    </div>
```

Uses `cloud-download.svg` which exists in `client/public/icons/`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/AppHeader.vue
git commit -m "feat(offers): add offers link to header navigation"
```

---

### Task 22: Verify the build compiles

- [ ] **Step 1: Run TypeScript check**

```bash
cd client && npx vue-tsc --noEmit
```

Fix any type errors that arise.

- [ ] **Step 2: Run build**

```bash
cd client && npm run build
```

Fix any build errors.

- [ ] **Step 3: Run server TypeScript check**

```bash
cd server && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors from offers feature"
```

---

### Task 23: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test demo mode**

Navigate to `/`, click "Demo mode", then navigate to `/offers`. Verify:
- 3 mock offers load
- "Afventer svar" group expanded with 2 offers
- "Accepteret" group collapsed with 1 offer
- Cards show deadline urgency colors (red for tomorrow, amber for 5 days, green for 10 days)
- Click a card → detail sheet opens with drag-to-dismiss
- Accept/decline buttons visible
- Financials modal opens
- Image gallery works

- [ ] **Step 3: Commit if any final tweaks needed**

```bash
git add -A
git commit -m "fix: polish offers feature after smoke test"
```

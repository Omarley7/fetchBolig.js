# Data Integrity Fixes: Message Filter, showingText Fallback, Recipient State

**Date:** 2026-03-11
**Status:** Draft

## Problem

Three data integrity issues in appointment extraction:

1. **Message filter too narrow** — The filter in `openai-extractor.ts:66` only matches messages containing "åbent hus" (open house). Many landlords use "fremvisning" (showing/viewing) instead, causing the LLM to never see relevant messages and returning empty dates.

2. **No showingText fallback** — When thread messages yield no date (e.g. showing is planned later and communicated via the offer's `showingText` field), there is no fallback extraction path.

3. **Missing recipient state** — The `Appointment` type has no way to know if the user accepted, declined, or hasn't responded to an offer. The API provides this in `recipients[0].state`.

## Scope

- Fix the message filter to also match "fremvisning"
- Add a fallback path that extracts dates from `offer.showingText` via the same LLM when thread extraction yields no date
- Add `recipientState`, `accepted`, and `declined` fields to the `Appointment` type
- No client-side presentation changes for recipient state (data-only)

## Design

### 1. Broaden message filter

**File:** `server/src/lib/llm/openai-extractor.ts`

Change the filter at line 65-68 from:

```typescript
const openHouseMessages = agentMessages.filter((message) =>
  message.body.toLowerCase().includes("åbent hus"),
);
```

To:

```typescript
const showingMessages = agentMessages.filter((message) => {
  const body = message.body.toLowerCase();
  return body.includes("åbent hus") || body.includes("fremvisning");
});
```

Update `EXTRACTION_PROMPT` to mention both "åbent hus" and "fremvisning":

```
Du er en dansk tekst-analysator. Ekstraher dato og tidspunkt for fremvisning eller åbent hus fra beskeden.

Vigtige regler:
- Datoen SKAL formateres som YYYY-MM-DD (f.eks. 2025-12-15)
- Starttiden SKAL formateres som HH:mm (f.eks. 16:00)
- Sluttiden SKAL formateres som HH:mm (f.eks. 16:00)
- Hvis der ikke findes nogen dato eller start- eller sluttid, returner en tom dato og tidspunkt
- Hvis fremvisningen eller åbent hus er aflyst, returner cancelled som true, og date, startTime og endTime som tomme dato og tidspunkt
- Hvis der er flere beskeder om fremvisning eller åbent hus, skal du bruge den seneste besked
- Antag at året er {currentYear} hvis det ikke er specificeret
```

Also update the input text sent to the LLM to say "fremvisning/åbent hus" instead of only "åbent hus".

### 2. Extract shared LLM call helper + showingText fallback

**File:** `server/src/lib/llm/openai-extractor.ts`

Refactor `extractAppointmentDetailsWithLLM` into two parts:

1. **`callLLMForAppointmentDetails(context: string, currentYear: string)`** — The core LLM call. Takes a text context string and current year, returns `AppointmentDetails`. This is the extracted inner logic (prompt formatting, OpenAI call, parsing). Returns the empty default if context is empty/whitespace-only (avoids wasting an API call).

2. **`extractAppointmentDetailsWithLLM(thread, currentYear)`** — Stays as the primary entry point. Filters messages, builds context, calls `callLLMForAppointmentDetails`.

3. **`extractAppointmentDetailsFromShowingText(showingText: string, currentYear: string)`** — New function. Strips HTML from `showingText`, calls `callLLMForAppointmentDetails` with the cleaned text.

**File:** `server/src/findbolig-service.ts`

In `getUpcomingAppointments` (line 272), derive `currentYear` and pass it to both extraction paths:

```typescript
const currentYear = new Date().getFullYear().toString();

// ... inside the offers.map callback:
let details = await extractAppointmentDetailsWithLLM(thread, currentYear);

// Fallback: if no date from thread, try showingText
if (!details.date && offer.showingText) {
  details = await extractAppointmentDetailsFromShowingText(
    offer.showingText,
    currentYear,
  );
}
```

Note: `currentYear` is currently missing from the call at line 272 (passed as `undefined`) — this will be fixed as part of this change.

### 3. Recipient state on Appointment type

**File:** `server/src/types/offers.ts`

Add a typed schema for recipients, replacing `z.array(z.unknown())`:

```typescript
const ApiOfferRecipient = z.object({
  accepted: z.string().nullable(),
  declined: z.string().nullable(),
  received: z.string().nullable(),
  state: z.string(),
  internalState: z.string().nullable(),
});
```

Update `ApiOffer.recipients` to `z.array(ApiOfferRecipient).optional()`.

Also update `showingText` from `z.string()` to `z.string().nullable()` — if the API returns null for an offer with no showing text, the current non-nullable schema would reject the entire offer before the fallback logic is reached.

**File:** `shared/types.ts`

Add to `Appointment`:

```typescript
recipientState: string | null;  // e.g. "OfferReceived", "OfferAccepted", "OfferDeclined", etc.
accepted: string | null;        // ISO timestamp when user accepted
declined: string | null;        // ISO timestamp when user declined
```

**File:** `server/src/lib/findbolig-domain.ts`

In `mapAppointmentToDomain`, add three new fields to the existing inline return object (not using spread — matching the current pattern):

```typescript
const recipient = offer.recipients?.[0];
return {
  // ... existing fields ...
  recipientState: recipient?.state ?? null,
  accepted: recipient?.accepted ?? null,
  declined: recipient?.declined ?? null,
};
```

**Note:** The `ApiOfferRecipient` schema change in `offers.ts` must be applied before the domain mapper, since the current `z.array(z.unknown())` type would not allow `recipient?.state` to type-check.

### 4. Empty-string to null normalization

The LLM returns `""` for missing dates, but `Appointment.date` is typed as `string | null`. Add normalization in `mapAppointmentToDomain`:

```typescript
date: details.date || null,
start: details.startTime || null,
end: details.endTime || null,
```

### 5. Mock data update

**File:** `client/src/data/mockData.ts`

Add the three new fields to each mock `Appointment` object:

```typescript
recipientState: "OfferAccepted",
accepted: "2026-02-15T10:00:00Z",
declined: null,
```

## Reference: API Enums

### RecipientState values
| Value | Danish |
|---|---|
| OfferAccepted | Tilbud accepteret |
| OfferAwardedToSomeoneElse | Tildelt til anden ansoger |
| OfferAwardedToYou | Tildelt til dig |
| OfferDeclined | Tilbud afvist |
| OfferJumpedOff | Sprunget fra |
| OfferNoAnswer | Tilbud ikke besvaret |
| OfferNotReceived | Intet svar |
| OfferReceived | Tilbud modtaget |
| OfferReleased | Tilbud trukket tilbage |
| OfferResponseDeadlineExpired | Svarfrist udlobet |
| OfferWaitingForPropAdmin | Afvent udlejer |

### OfferState values
| Value | Danish |
|---|---|
| Draft | Udkast |
| Published | Udsendt |
| Changed | Aendret |
| Finished | Afsluttet |
| Awarded | Tildelt |
| AwardedExternally | Tildelt eksternt |
| Released | Frigjort |
| RetiredFromAwarded | Lukket efter udlejning |

## Files changed

| File | Change |
|---|---|
| `server/src/lib/llm/openai-extractor.ts` | Broaden filter, extract shared helper, add `extractAppointmentDetailsFromShowingText` |
| `server/src/findbolig-service.ts` | Add showingText fallback after thread extraction, fix missing `currentYear` arg |
| `server/src/types/offers.ts` | Add `ApiOfferRecipient` schema, type `recipients` properly |
| `shared/types.ts` | Add `recipientState`, `accepted`, `declined` to `Appointment` |
| `server/src/lib/findbolig-domain.ts` | Map recipient fields in `mapAppointmentToDomain` |

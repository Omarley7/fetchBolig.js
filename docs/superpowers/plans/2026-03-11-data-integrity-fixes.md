# Data Integrity Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix appointment date extraction to handle "fremvisning" messages, add showingText fallback, and expose recipient state on the Appointment type.

**Architecture:** Three independent changes to the server pipeline: (1) broaden the message filter and LLM prompt, (2) refactor extractor into a shared helper + add showingText fallback path, (3) add recipient schema/types/mapping. All changes flow through the same offer-to-appointment pipeline.

**Tech Stack:** TypeScript, Zod, OpenAI API (gpt-5-nano), Hono server

**Spec:** `docs/superpowers/specs/2026-03-11-data-integrity-fixes-design.md`

---

## Chunk 1: Type schema + recipient state

> **Note:** `server/src/findbolig-service.ts:272` has a pre-existing bug: it calls `extractAppointmentDetailsWithLLM(thread)` without the required `currentYear` argument. This causes a TypeScript error that will appear in all `tsc --noEmit` checks in this chunk. Ignore this error — it is fixed in Chunk 2, Task 7.

### Task 1: Add ApiOfferRecipient schema and update ApiOffer

**Files:**
- Modify: `server/src/types/offers.ts:1-28`

- [ ] **Step 1: Add ApiOfferRecipient schema and update recipients + showingText**

In `server/src/types/offers.ts`, add the recipient schema before the `ApiOffer` definition, update `recipients` typing, and make `showingText` nullable:

```typescript
// Add before the ApiOffer definition (before line 4)
const ApiOfferRecipient = z.object({
  accepted: z.string().nullable(),
  declined: z.string().nullable(),
  received: z.string().nullable(),
  state: z.string(),
  internalState: z.string().nullable(),
});

export type ApiOfferRecipient = z.infer<typeof ApiOfferRecipient>;
```

In the `ApiOffer` object:
- Change line 10 from `showingText: z.string(),` to `showingText: z.string().nullable(),`
- Change line 13 from `recipients: z.array(z.unknown()).optional(),` to `recipients: z.array(ApiOfferRecipient).optional(),`

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: Only the pre-existing error at `findbolig-service.ts:272` (missing `currentYear` arg). No new errors from this change.

- [ ] **Step 3: Commit**

```bash
git add server/src/types/offers.ts
git commit -m "feat: add typed ApiOfferRecipient schema, make showingText nullable"
```

### Task 2: Add recipient fields to Appointment type

**Files:**
- Modify: `shared/types.ts:1-15`

- [ ] **Step 1: Add three new fields to Appointment**

In `shared/types.ts`, add after the `position` field (line 14):

```typescript
  recipientState: string | null;
  accepted: string | null;
  declined: string | null;
```

- [ ] **Step 2: Verify TypeScript compiles (expect errors in mockData and domain mapper)**

Run: `cd server && npx tsc --noEmit`
Expected: Errors in `findbolig-domain.ts` and `client/src/data/mockData.ts` (missing new fields) plus the pre-existing `findbolig-service.ts:272` error. All expected — fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add shared/types.ts
git commit -m "feat: add recipientState, accepted, declined to Appointment type"
```

### Task 3: Map recipient fields in domain mapper + normalize empty strings

**Files:**
- Modify: `server/src/lib/findbolig-domain.ts:6-43`

- [ ] **Step 1: Add recipient extraction and empty-string normalization**

In `server/src/lib/findbolig-domain.ts`, in the `mapAppointmentToDomain` function:

1. Add recipient extraction before the return statement (after line 16):
```typescript
  const recipient = offer.recipients?.[0];
```

2. Change the date/time fields in the return object from:
```typescript
    date: details.date,
    start: details.startTime,
    end: details.endTime,
```
To:
```typescript
    date: details.date || null,
    start: details.startTime || null,
    end: details.endTime || null,
```

3. Add three new fields at the end of the return object (before the closing `};`), after `position,`:
```typescript
    recipientState: recipient?.state ?? null,
    accepted: recipient?.accepted ?? null,
    declined: recipient?.declined ?? null,
```

- [ ] **Step 2: Verify server TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: Only the pre-existing `findbolig-service.ts:272` error and client mock data errors (fixed in Task 4). No new errors from this change.

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/findbolig-domain.ts
git commit -m "feat: map recipient state + normalize empty dates to null"
```

### Task 4: Update mock data

**Files:**
- Modify: `client/src/data/mockData.ts:1-92`

- [ ] **Step 1: Add recipient fields to both mock appointments**

In `client/src/data/mockData.ts`, add to the first mock object (after `position: 257,` on line 44):
```typescript
      recipientState: "OfferAccepted",
      accepted: "2026-02-15T10:00:00Z",
      declined: null,
```

Add to the second mock object (after `position: 262,` on line 90):
```typescript
      recipientState: "OfferAccepted",
      accepted: "2026-02-20T14:00:00Z",
      declined: null,
```

- [ ] **Step 2: Verify project compiles (except pre-existing service error)**

Run: `cd server && npx tsc --noEmit`
Expected: Only the pre-existing `findbolig-service.ts:272` error remains (fixed in Chunk 2, Task 7). No other errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/data/mockData.ts
git commit -m "feat: add recipient fields to mock appointment data"
```

---

## Chunk 2: Message filter + LLM refactor + showingText fallback

> **Dependency:** Chunk 1 must be completed first. Task 1 makes `showingText` nullable in the Zod schema, which is required for the fallback in Task 7 to handle `null` values without Zod rejection.
>
> **Note:** `findbolig-service.ts:272` will continue to show a compile error through Tasks 5-6. This is fixed in Task 7 when the call site is updated with `currentYear`. The `tsc` checks in Tasks 5-6 should expect this error.

### Task 5: Broaden message filter and update LLM prompt

**Files:**
- Modify: `server/src/lib/llm/openai-extractor.ts:35-79`

- [ ] **Step 1: Update EXTRACTION_PROMPT**

In `server/src/lib/llm/openai-extractor.ts`, replace the `EXTRACTION_PROMPT` constant (lines 35-44) with:

```typescript
const EXTRACTION_PROMPT = `Du er en dansk tekst-analysator. Ekstraher dato og tidspunkt for fremvisning eller åbent hus fra beskeden.

Vigtige regler:
- Datoen SKAL formateres som YYYY-MM-DD (f.eks. 2025-12-15)
- Starttiden SKAL formateres som HH:mm (f.eks. 16:00)
- Sluttiden SKAL formateres som HH:mm (f.eks. 16:00)
- Hvis der ikke findes nogen dato eller start- eller sluttid, returner en tom dato og tidspunkt
- Hvis fremvisningen eller åbent hus er aflyst, returner cancelled som true, og date, startTime og endTime som tomme dato og tidspunkt
- Hvis der er flere beskeder om fremvisning eller åbent hus, skal du bruge den seneste besked
- Antag at året er {currentYear} hvis det ikke er specificeret`;
```

- [ ] **Step 2: Broaden the message filter**

Replace lines 65-68 (the filter block) from:

```typescript
  // Filter out messages that do not include 'åbent hus'
  const openHouseMessages = agentMessages.filter((message) =>
    message.body.toLowerCase().includes("åbent hus"),
  );
```

To:

```typescript
  // Filter to messages about showings (åbent hus or fremvisning)
  const showingMessages = agentMessages.filter((message) => {
    const body = message.body.toLowerCase();
    return body.includes("åbent hus") || body.includes("fremvisning");
  });
```

- [ ] **Step 3: Update all references from `openHouseMessages` to `showingMessages`**

In the same function, update:
- Line 70: `if (openHouseMessages.length === 0)` → `if (showingMessages.length === 0)`
- Line 74: `const context = openHouseMessages.map(...)` → `const context = showingMessages.map(...)`

- [ ] **Step 4: Update the input text to the LLM**

Change line 79 from:
```typescript
    input: `Ekstraher dato og tidspunkt fra følgende besked(er) om åbent hus:\n\n${context}`,
```
To:
```typescript
    input: `Ekstraher dato og tidspunkt fra følgende besked(er) om fremvisning/åbent hus:\n\n${context}`,
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: Only the pre-existing `findbolig-service.ts:272` error (missing `currentYear` arg). No new errors from this change.

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/llm/openai-extractor.ts
git commit -m "fix: broaden message filter to match fremvisning + update LLM prompt"
```

### Task 6: Extract shared LLM helper and add showingText export

**Files:**
- Modify: `server/src/lib/llm/openai-extractor.ts:46-91`

- [ ] **Step 1: Extract `callLLMForAppointmentDetails` helper**

In `server/src/lib/llm/openai-extractor.ts`, add a new private helper function before `extractAppointmentDetailsWithLLM`:

```typescript
const EMPTY_DETAILS: AppointmentDetails = { date: "", startTime: "", endTime: "", cancelled: false };

async function callLLMForAppointmentDetails(
  context: string,
  currentYear: string,
): Promise<AppointmentDetails> {
  if (!context.trim()) {
    return EMPTY_DETAILS;
  }

  const response = await openai.responses.parse({
    model: "gpt-5-nano-2025-08-07",
    instructions: EXTRACTION_PROMPT.replace("{currentYear}", currentYear),
    input: `Ekstraher dato og tidspunkt fra følgende besked(er) om fremvisning/åbent hus:\n\n${context}`,
    text: {
      format: zodTextFormat(AppointmentDetailsSchema, "appointment_details"),
    },
  });

  return response.output_parsed ?? EMPTY_DETAILS;
}
```

- [ ] **Step 2: Refactor `extractAppointmentDetailsWithLLM` to use the helper**

Replace the body of `extractAppointmentDetailsWithLLM` (keep the signature). The function should now be:

```typescript
export async function extractAppointmentDetailsWithLLM(
  thread: ApiMessageThreadFull,
  currentYear: string,
) {
  const messages = thread.messages.sort(
    (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
  );

  const cleanMessages = messages.map((message) => ({
    ...message,
    body: message.body.replace(/<[^>]*>?/g, ""),
  }));

  const agentMessages = cleanMessages.filter(
    (message) => message.sender?.name?.toLowerCase() !== "findbolig",
  );

  const showingMessages = agentMessages.filter((message) => {
    const body = message.body.toLowerCase();
    return body.includes("åbent hus") || body.includes("fremvisning");
  });

  if (showingMessages.length === 0) {
    return EMPTY_DETAILS;
  }

  const context = showingMessages.map((message) => message.body).join("\n\n");
  return callLLMForAppointmentDetails(context, currentYear);
}
```

- [ ] **Step 3: Add `extractAppointmentDetailsFromShowingText` export**

Add at the end of the file:

```typescript
export async function extractAppointmentDetailsFromShowingText(
  showingText: string,
  currentYear: string,
): Promise<AppointmentDetails> {
  const cleanText = showingText.replace(/<[^>]*>?/g, "");
  return callLLMForAppointmentDetails(cleanText, currentYear);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: Only the `findbolig-service.ts:272` error (missing `currentYear` arg — fixed in Task 7). No new errors from this change.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/llm/openai-extractor.ts
git commit -m "refactor: extract shared LLM helper, add showingText extractor"
```

### Task 7: Wire up showingText fallback in findbolig-service

**Files:**
- Modify: `server/src/findbolig-service.ts:11,248-280`

- [ ] **Step 1: Add import for the new function**

In `server/src/findbolig-service.ts`, change line 11 from:
```typescript
import { extractAppointmentDetailsWithLLM } from "./lib/llm/openai-extractor";
```
To:
```typescript
import { extractAppointmentDetailsWithLLM, extractAppointmentDetailsFromShowingText } from "./lib/llm/openai-extractor";
```

- [ ] **Step 2: Add currentYear and showingText fallback**

In the `getUpcomingAppointments` function, add `currentYear` before the `Promise.all` (after line 248, inside the try block):

```typescript
    const currentYear = new Date().getFullYear().toString();
```

Then replace line 272:
```typescript
        const details = await extractAppointmentDetailsWithLLM(thread);
```
With:
```typescript
        let details = await extractAppointmentDetailsWithLLM(thread, currentYear);

        // Fallback: if no date from thread messages, try the offer's showingText
        if (!details.date && offer.showingText) {
          details = await extractAppointmentDetailsFromShowingText(
            offer.showingText,
            currentYear,
          );
        }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Manual smoke test**

Run the server and verify:
1. Offers with "fremvisning" messages now get dates extracted
2. The showingText fallback fires when thread messages have no date keywords
3. Recipient state appears in the appointment response

Run: `cd server && npm run dev`
Then call: `GET /api/appointments/upcoming`

- [ ] **Step 5: Commit**

```bash
git add server/src/findbolig-service.ts
git commit -m "feat: add showingText fallback + fix missing currentYear arg"
```

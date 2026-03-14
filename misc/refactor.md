# Client Architecture Refactor

## Problems to solve

### 1. Duplicated store boilerplate
`offers.ts` and `appointments.ts` are nearly identical — same `init()`, `refresh()`, `handleRefresh()`, `needsRefresh`, `sessionExpired`, `isLoading` patterns. A bug in one is likely a bug in the other (see: demo mode fix on `acceptOffer`/`declineOffer`).

**Fix**: Extract a `createResourceStore(config)` factory. Each store only defines what's unique — mock data, API calls, grouping logic.

---

### 2. Split data layer
Per domain there are two files with no clean separation rationale:
- `offers.ts` — caching
- `offersSource.ts` — API calls
- (same for appointments)

`fetchWithTimeout` is also duplicated between both source files.

**Fix**: Merge into a single `offersApi.ts` per domain. One import, one mental model.

---

### 3. Demo mode is scattered
`if (auth.isDemo)` guards are checked individually in each store action. Every new action needs a manual demo guard — which is how the accept/decline bug slipped through.

**Fix**: Wrap the API layer with a demo adapter. Stores call `offersApi.accept(id)` and the adapter transparently returns mock state if in demo mode. Stores stop importing or caring about `isDemo`.

```
Store → offersApi.accept(id) → [DemoAdapter | RealAdapter] → result
```

---

### 4. Stores have too many concerns
Each store currently handles: session validation, demo detection, error toasts, image URL generation, cache management, loading state.

`getImageUrl()` is a pure utility duplicated in both stores — it belongs in `lib/imageTransform.ts` where the rest of the image logic already lives.

---

### 5. Cross-store state mutation
`stores/offers.ts` directly sets `auth.showLoginModal = true`. State in one store shouldn't be imperatively mutated from another.

**Fix**: Expose an action on the auth store, or use a global event bus for UI-level state like modals.

---

## Target structure

```
src/
├── features/
│   ├── auth/
│   │   ├── useAuth.ts
│   │   └── authStore.ts
│   ├── offers/
│   │   ├── offersStore.ts          ← thin, uses factory
│   │   ├── offersApi.ts            ← merged source + cache
│   │   └── useGroupOffers.ts
│   └── appointments/
│       ├── appointmentsStore.ts
│       ├── appointmentsApi.ts
│       └── useGroupAppointments.ts
├── shared/
│   ├── stores/
│   │   ├── createResourceStore.ts  ← shared store factory
│   │   └── toastStore.ts
│   ├── api/
│   │   ├── httpClient.ts           ← fetchWithTimeout, HttpError, handleApiError
│   │   └── demoAdapter.ts          ← centralized demo mode logic
│   ├── lib/
│   └── components/
└── views/
```

---

## Priority order

1. **`shared/api/httpClient.ts`** — consolidate `fetchWithTimeout`, `HttpError`, `handleApiError` from both source files. Low effort, high value, eliminates drift.
2. **Merge `offers.ts` + `offersSource.ts`** (and appointments) — reduces confusion, one file per domain.
3. **Move `getImageUrl()` out of stores** — already has a home in `lib/imageTransform.ts`.
4. **`demoAdapter.ts`** — prevents future demo bugs from slipping through unnoticed.
5. **`createResourceStore` factory** — biggest refactor, eliminates the largest source of duplication.

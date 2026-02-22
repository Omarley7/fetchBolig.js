# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FetchBolig.js is a better dashboard for FindBolig.nu (Danish housing platform) with local storage and offline access. Live at https://fetchBolig.dk.

## Commands

```bash
npm install          # Install all dependencies (root, client, server)
npm run dev          # Run client + server concurrently (dev mode)
npm run dev:client   # Run Vite dev server only
npm run dev:server   # Run server with tsx watch only
npm run build        # Build client (vue-tsc + vite build)
npm start            # Start production server
```

No test runner or linter is currently configured.

## Architecture

Monorepo using npm workspaces with three packages:

- **`client/`** — Vue 3 SPA (Vite, TypeScript, Tailwind CSS 4, Pinia, Vue Router, Vue i18n)
- **`server/`** — Hono web framework on Node.js (TypeScript via tsx). Acts as a proxy/aggregator for the FindBolig.nu API. Also serves the built client as static files with SPA fallback.
- **`shared/`** — Shared TypeScript types (`types.ts`) used by both client and server

### Path Aliases

Both client and server use these TypeScript/Vite path aliases:
- `~` → `src/` (within the respective package)
- `@` → `shared/` (from repo root)

### Server

All routes are defined in `server/src/index.ts` using Hono. The `findbolig-service.ts` file handles all communication with the FindBolig.nu API. Auth is session/cookie-based, validated via helpers in `server/src/lib/auth-helpers.ts`.

LLM integration in `server/src/lib/llm/openai-extractor.ts` uses OpenAI/OpenRouter to extract appointment details from message threads.

### Client

- State management: Pinia stores in `client/src/stores/`
- Data fetching: `client/src/data/` (includes mock data support via `VITE_USE_MOCK_DATA` env var)
- Composables: `client/src/composables/` (auth, dark mode, appointment grouping)
- i18n: Danish (`da.ts`) and English (`en.ts`) in `client/src/i18n/locales/`
- Custom elements with `add-` prefix are whitelisted in Vite config

### Environment Variables

Defined in root `.env`:
- `VITE_BACKEND_DOMAIN` — Backend URL (default: `localhost:3000`)
- `VITE_USE_MOCK_DATA` — Enable mock data for offline client dev
- `VITE_IMAGE_BASE_URL` — Image CDN base URL
- `OPENAI_API_KEY` — For LLM-powered appointment extraction

## Code Style

Prettier config (`client/.prettierrc`): 2-space indent, no tabs, 105 char print width.

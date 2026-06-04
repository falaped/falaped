# Architecture

**Analysis Date:** 2026-06-04

## Pattern Overview

**Overall pattern:** Layered full-stack Next.js App Router application with a strict three-tier flow:

```
app/ (pages + client components)
  → actions/ ("use server" — auth gate + Zod validation + orchestration)
    → modules/ (one-function-per-file domain logic, injected SupabaseClient)
      → Supabase (Postgres/Auth/Storage) and Groq (LLM/Whisper)
```

`app/api/**/route.ts` route handlers exist only for responses Server Actions can't produce — binary/redirect payloads (PDF downloads in `app/api/prescriptions/`, `app/api/medical-certificates/`; audio transcription in `app/api/consultation-audio/`).

## Layers

**Presentation — `app/`, `components/`:**
- App Router pages under `app/dashboard/*` (cases, patients, prescriptions, medical-certificates, discussions, templates, profile, link-whatsapp)
- Auth flow pages under `app/auth/*`
- Feature components in `components/dashboard/<domain>/`, shadcn primitives in `components/ui/`

**Action layer — `actions/`:**
- `"use server"` functions, one domain per directory with `index.ts` barrels plus root `actions/index.ts`
- Every action: builds a per-request Supabase client → calls `getAuthenticatedUser(supabase)` → gates on `profile.status === "paid"` → validates input with Zod → delegates to `modules/`
- Returns discriminated result unions: `{ ok: true, ... } | { ok: false, error: string }`

**Domain layer — `modules/`:**
- One exported function per file, organized by domain (`modules/cases/`, `modules/patients/`, `modules/prescriptions/`, etc.)
- Receives `SupabaseClient` by injection — never constructs clients, never imports `next/cache` or `next/headers`
- Throws `Error("[DOMAIN] ...")` on failure; actions catch and convert to result unions

**Infrastructure — `lib/`:**
- `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/proxy.ts` — per-request client factories (never global; Fluid-compute constraint documented in `lib/supabase/server.ts`)
- `lib/env.ts` — Zod-validated env at import time
- `lib/schemas/` — shared Zod schemas; `lib/pdf/` — PDF helpers over `@falaped/falaped-kit/pdf`

## Data Flow

**Standard mutation flow:**
1. Client component calls a server action (e.g. `actions/cases/send-case-assistant-message.ts`)
2. Action authenticates via `modules/supabase/get-authenticated-user.ts`, validates with Zod
3. Action calls module functions (e.g. `modules/cases/get-case-by-id.ts`), scoped by `profile_id`/`user_phone`
4. Module performs Supabase queries; throws on error
5. Action catches, returns `{ ok, ... }` union; UI narrows on `ok`

**Assistant turn pipeline (`modules/falaped-assistant/`):**
1. Incoming message → intent detection (`intent/`, `lib/intent-detection.ts`)
2. Build/advance turn queue (`pipeline/assistant-turn-queue.ts`, `contracts/turn-queue.ts`)
3. Plan actions (`planning/plan-assistant-turn-actions.ts`, LLM-backed `planning/extract-actions-by-llm.ts`)
4. Dispatch via `HANDLERS` registry in `router/dispatch.ts` → handlers in `handlers/`
5. Orchestrated by `orchestrator/process-turn.ts`
6. Structured payloads embedded in message content as serialized `__FALAPED_JSON__` blocks

**Request lifecycle / auth:**
- `proxy.ts` → `lib/supabase/proxy.ts` runs on every request: validates session, redirects unauthenticated users

## Key Abstractions

- **Result unions at the action boundary** — modules throw, actions catch and return `{ ok: true } | { ok: false; error }`
- **Per-request Supabase clients** — created per call in `lib/supabase/server.ts` (Fluid compute: never global)
- **Auth + paid gate** — `getAuthenticatedUser(supabase)` + `profile.status === "paid"` check in every action/route handler
- **Handler registry** — `modules/falaped-assistant/router/dispatch.ts` maps intents to handlers
- **Ownership scoping** — all queries filtered by `profile_id` / `user_phone`

## Entry Points

- `app/layout.tsx` — root layout, metadata (uses `VERCEL_URL`)
- `app/page.tsx` — redirects to `/dashboard`
- `proxy.ts` — request middleware → `lib/supabase/proxy.ts` (session validation + auth redirects)
- `app/api/*/route.ts` — binary/redirect endpoints only
- `next.config.ts` — `cacheComponents: true`, `serverExternalPackages: ["pdfkit"]`, Server Actions `bodySizeLimit: "25mb"`

## Constraints / Anti-patterns to Avoid

- Do not construct Supabase clients in modules — inject them
- Do not import `next/cache` / `next/headers` inside `modules/`
- Do not skip the auth + paid-status gate in new actions/route handlers
- Do not return thrown errors raw to the client — convert to result unions in actions
- Route handlers only when a Server Action cannot serve the response type

---

*Architecture analysis: 2026-06-04*

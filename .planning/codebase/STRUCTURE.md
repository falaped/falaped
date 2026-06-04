# Codebase Structure

**Analysis Date:** 2026-06-04

## Directory Layout

```
falaped/
├── app/                      # Next.js App Router pages + API routes
│   ├── api/                  # Route handlers (binary/redirect only)
│   │   ├── consultation-audio/
│   │   ├── medical-certificates/
│   │   └── prescriptions/
│   ├── auth/                 # Auth pages (login, sign-up, confirm, forgot/update-password, error)
│   ├── dashboard/            # Main app — one route dir per domain
│   │   ├── cases/  discussions/  link-whatsapp/  medical-certificates/
│   │   ├── patients/  prescription-templates/  prescriptions/
│   │   ├── profile/  report-templates/
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Redirects to /dashboard
├── actions/                  # "use server" actions — one dir per domain + index.ts barrels
│   ├── cases/  discussions/  link-whatsapp/  medical-certificates/
│   ├── patients/  prescription-templates/  prescriptions/
│   ├── profile/  report-templates/
│   └── index.ts              # Root barrel
├── modules/                  # Domain logic — one exported function per file
│   ├── authenticated-users/  case-messages/  cases/  consultation-audio/
│   ├── dashboard/  discussions/  medical-certificates/  patients/
│   ├── phone-link-codes/  prescription-templates/  prescriptions/
│   ├── profiles/  report-templates/
│   ├── falaped-assistant/    # Assistant pipeline
│   │   ├── contracts/  handlers/  intent/  lib/
│   │   ├── orchestrator/  pipeline/  planning/  router/
│   ├── groq/                 # Groq LLM/Whisper integration (+ lib/ parsers)
│   └── supabase/             # Auth helpers (get-authenticated-user.ts)
├── components/
│   ├── dashboard/<domain>/   # Feature components mirroring app/dashboard routes
│   └── ui/                   # shadcn/ui primitives
├── hooks/                    # React hooks
├── lib/                      # Infrastructure utilities
│   ├── supabase/             # client.ts, server.ts, proxy.ts factories
│   ├── schemas/              # Shared Zod schemas (auth.ts, ...)
│   ├── pdf/                  # PDF helpers (@falaped/falaped-kit/pdf)
│   ├── env.ts                # Zod-validated environment
│   └── utils.ts              # cn() etc. (shadcn scaffold)
├── types/                    # Shared TypeScript types
├── supabase/                 # Migrations + seed SQL
├── scripts/                  # Utility scripts
├── docs/                     # Project docs
├── data-msg/                 # Message data fixtures
├── public/                   # Static assets
├── proxy.ts                  # Request middleware entry → lib/supabase/proxy.ts
├── next.config.ts            # Next.js config
└── package.json              # Yarn 1.22.22 pinned
```

## Key File Locations

**Entry points:**
- `app/layout.tsx`, `app/page.tsx`, `proxy.ts`

**Configuration:**
- `next.config.ts`, `tsconfig.json` (alias `@/*` → `./*`), `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `lib/env.ts`

**Core domain logic:**
- `modules/<domain>/<verb-noun>.ts` — e.g. `modules/cases/get-case-by-id.ts`
- Assistant orchestration: `modules/falaped-assistant/orchestrator/process-turn.ts`, `router/dispatch.ts`

**Auth/session:**
- `modules/supabase/get-authenticated-user.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`

**Tests:**
- Co-located `*.spec.ts` next to source in `modules/` and `lib/` (31 files)

## Naming Conventions

**Files:**
- kebab-case for all files: `send-case-assistant-message.ts`, `get-case-by-id.ts`
- Module files named verb-noun after the single function they export
- Tests: `<name>.spec.ts` co-located with source
- Components: kebab-case files, PascalCase exports

**Code:**
- camelCase functions/variables; PascalCase types/components
- Server actions suffixed `Action`
- Boolean helpers prefixed `is`/`has`/`should`

## Where to Add New Code

**New domain feature (full slice):**
1. Domain functions → `modules/<domain>/<verb-noun>.ts` (+ `.spec.ts` if pure logic)
2. Server actions → `actions/<domain>/` with `index.ts` barrel; re-export from `actions/index.ts`
3. Page → `app/dashboard/<domain>/`
4. Components → `components/dashboard/<domain>/`

**New assistant capability:**
- Intent → `modules/falaped-assistant/intent/`; handler → `handlers/`; register in `router/dispatch.ts`

**New shared schema:** `lib/schemas/`
**New UI primitive:** `components/ui/` (shadcn)
**New env var:** add to Zod schema in `lib/env.ts` + `.env.example`
**New binary endpoint:** `app/api/<domain>/route.ts` (only when a Server Action can't serve it)

---

*Structure analysis: 2026-06-04*

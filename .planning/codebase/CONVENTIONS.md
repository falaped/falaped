# Coding Conventions

**Analysis Date:** 2026-06-04

## Tooling

- Next.js 16 / React 19 / TypeScript 5 with `strict: true` (`tsconfig.json`)
- ESLint only (`eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`) — no Prettier, no Biome
- Path alias `@/*` → repo root; always import via `@/`

## Formatting

- 2-space indentation, double quotes throughout
- **Semicolon split (match the file you're editing):**
  - No semicolons in hand-written `.ts` under `modules/**`, `actions/**`, most of `lib/**`
  - Semicolons in `.tsx` files and Supabase-scaffolded files (`lib/utils.ts`, `lib/env.ts`, `lib/schemas/auth.ts`)
- User-facing strings are PT-BR (Brazilian Portuguese)

## Naming

- **Files:** kebab-case everywhere (`get-case-by-id.ts`, `patient-form.tsx`)
- **Functions/variables:** camelCase
- **Types/interfaces/components:** PascalCase
- **Server actions:** suffixed with `Action` (e.g. `sendCaseAssistantMessageAction`)
- **Boolean helpers:** prefixed `is` / `has` / `should`

## Module / Export Patterns

- One exported function per file in `modules/`
- Named exports only; `index.ts` barrels per `actions/<domain>/` plus a root `actions/index.ts`
- JSDoc comments on exported functions
- Modules receive `SupabaseClient` by injection; never construct clients or import `next/cache`/`next/headers`

## Error Handling

- **Modules:** `throw new Error("[DOMAIN] message")` — domain tag in brackets
- **Actions:** catch and return discriminated unions `{ ok: true, ... } | { ok: false; error: string }`
- **Components:** `catch (error: unknown)` and narrow before use
- **Validation:** Zod `safeParse` at boundaries (actions/route handlers); `lib/zod-error-message.ts` maps Zod issues to PT-BR messages
- **Environment:** `lib/env.ts` validates env vars with Zod at import time and throws on missing/invalid

## Validation & Schemas

- Zod ^4 for all input validation
- Shared schemas in `lib/schemas/`; form integration via `react-hook-form` + `@hookform/resolvers`

## Component Conventions

- shadcn/ui primitives in `components/ui/`; feature components in `components/dashboard/<domain>/`
- Class composition via `cn()` (`clsx` + `tailwind-merge`) from `lib/utils.ts`
- Tailwind CSS v4 utility classes; variants via `class-variance-authority`

## Security Conventions

- Every action and route handler calls `getAuthenticatedUser(supabase)` and gates on `profile.status === "paid"`
- All data access scoped by `profile_id` / `user_phone` ownership filters

---

*Conventions analysis: 2026-06-04*

# Technology Stack

**Analysis Date:** 2026-06-04

## Languages

**Primary:**
- TypeScript ^5 - All application code (`.ts`, `.tsx`) across `app/`, `lib/`, `modules/`, `actions/`, `components/`, `hooks/`
- TSX/JSX - React components (`react-jsx` transform per `tsconfig.json`)

**Secondary:**
- SQL - Database migrations and seeds in `supabase/migrations/` and `supabase/*.sql`

## Runtime

**Environment:**
- Node.js (`@types/node` ^20; targets ES2017 with `esnext` libs per `tsconfig.json`)
- Next.js server runtime (App Router, Server Actions, server-only modules)

**Package Manager:**
- Yarn 1.22.22 (pinned via `packageManager` field in `package.json`)
- Lockfile: present (`yarn.lock`, ~326 KB) — yarn-only per recent commit `556f6b8`

## Frameworks

**Core:**
- Next.js ^16.2.0 - Full-stack React framework (App Router). Config in `next.config.ts`
- React ^19.0.0 / React DOM ^19.0.0 - UI library
- Tailwind CSS ^4.2.1 - Styling (via `@tailwindcss/postcss`, `postcss.config.mjs`)
- shadcn/ui ^3.8.5 - Component scaffolding (`components.json`)

**Testing:**
- `tsx` ^4.21.0 with Node's built-in test runner - Runs `*.spec.ts` files in `modules/` and `lib/` (`yarn test` → `tsx --test`)

**Build/Dev:**
- TypeScript ^5 - Type checking (`yarn typecheck` → `tsc --noEmit`)
- ESLint ^9 - Linting (`eslint.config.mjs`, `eslint-config-next` 15.3.1)
- PostCSS ^8 - CSS processing
- tw-animate-css ^1.4.0 - Tailwind animation utilities

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` (latest) - Supabase database/auth/storage client
- `@supabase/ssr` (latest) - Cookie-based Supabase auth for SSR (server, client, proxy)
- `groq-sdk` ^0.37.0 - Groq LLM API client (chat completions + Whisper audio transcription)
- `@falaped/falaped-kit` 0.2.7 - Internal shared kit; provides PDF generation (`/pdf` subpath) and clinical helpers
- `zod` ^4.3.6 - Schema validation (env parsing in `lib/env.ts`, form/data schemas in `lib/schemas/`)
- `react-hook-form` ^7.71.2 + `@hookform/resolvers` ^5.2.2 - Form state and Zod resolver integration

**UI/Component:**
- `radix-ui` ^1.4.3 + `@radix-ui/react-*` - Headless UI primitives (checkbox, dropdown-menu, label, slot)
- `@base-ui/react` ^1.2.0 - Additional headless UI primitives
- `@tiptap/*` ^3.20.1 (core, pm, react, starter-kit) - Rich text editor
- `@dnd-kit/*` (core ^6.3.1, sortable ^10.0.0, utilities ^3.2.2) - Drag and drop
- `lucide-react` ^0.511.0 - Icon set
- `cmdk` ^1.1.1 - Command menu
- `sonner` ^2.0.7 - Toast notifications
- `next-themes` ^0.4.6 - Theme (dark/light) management
- `react-day-picker` ^9.4.4 - Date picker
- `class-variance-authority` ^0.7.1, `clsx` ^2.1.1, `tailwind-merge` ^3.5.0 - Class composition utilities
- `date-fns` ^4.1.0 - Date utilities

**Infrastructure:**
- `pdfkit` - PDF rendering (declared as `serverExternalPackages` in `next.config.ts`; used transitively via `@falaped/falaped-kit/pdf`)

## Configuration

**Environment:**
- Validated at startup via Zod schema in `lib/env.ts` (throws on invalid/missing required vars)
- `.env.local` (gitignored, present), `.env.example` template (`GROQ_ASSISTANT_MODEL` only)
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Optional: `GROQ_API_KEY`, `GROQ_ASSISTANT_MODEL` (default `qwen/qwen3-32b`), `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV`
- `VERCEL_URL` consumed in `app/layout.tsx` for metadata base URL

**Build:**
- `next.config.ts` - `cacheComponents: true`, `serverExternalPackages: ["pdfkit"]`, Server Actions `bodySizeLimit: "25mb"` (audio uploads)
- `tsconfig.json` - strict mode, `bundler` module resolution, path alias `@/*` → `./*`
- `postcss.config.mjs`, `eslint.config.mjs`, `components.json` (shadcn config)

## Platform Requirements

**Development:**
- Node.js (compatible with `@types/node` ^20)
- Yarn 1.x (Classic)
- Supabase project (URL + publishable key) for full functionality
- Groq API key for AI assistant / transcription features

**Production:**
- Vercel (target deployment; `VERCEL_URL` referenced, `.vercel` gitignored, README is Supabase + Vercel starter)
- Supabase (hosted Postgres + Auth + Storage)

---

*Stack analysis: 2026-06-04*

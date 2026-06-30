<!-- GSD:project-start source:PROJECT.md -->

## Project

**Falaped**

Falaped é um app web para o dia a dia do pediatra: cadastro de pacientes (crianças), geração de documentos clínicos (receitas, atestados, laudos/relatórios de caso), templates reutilizáveis, condução de consultas e um assistente de IA (Groq) para apoio clínico e transcrição. Este ciclo foca em melhorar a experiência da consulta pediátrica, ampliar os tipos de documento e adicionar suporte a vacinação.

**Core Value:** A consulta pediátrica precisa fluir sem fricção — o médico abre o paciente, conduz a consulta e gera os documentos certos (impressos corretamente) em poucos cliques.

### Constraints

- **Tech stack**: Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind 4, shadcn/ui — manter o padrão de três camadas `app/ → actions/ → modules/`.
- **Backend**: Supabase (Postgres + Auth + Storage) — toda query escopada por `profile_id`; manter gate de assinatura nos novos actions.
- **PDF**: geração via `@falaped/falaped-kit/pdf` (pdfkit como `serverExternalPackage`) — a correção de impressão atua aqui.
- **Privacidade**: fotos de crianças são dado sensível — armazenar com cuidado (acesso escopado ao médico dono).
- **Sem prazo**: melhoria contínua, sem data limite — priorizar por dor real de uso.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript ^5 - All application code (`.ts`, `.tsx`) across `app/`, `lib/`, `modules/`, `actions/`, `components/`, `hooks/`
- TSX/JSX - React components (`react-jsx` transform per `tsconfig.json`)
- SQL - Database migrations and seeds in `supabase/migrations/` and `supabase/*.sql`

## Runtime

- Node.js (`@types/node` ^20; targets ES2017 with `esnext` libs per `tsconfig.json`)
- Next.js server runtime (App Router, Server Actions, server-only modules)
- Yarn 1.22.22 (pinned via `packageManager` field in `package.json`)
- Lockfile: present (`yarn.lock`, ~326 KB) — yarn-only per recent commit `556f6b8`

## Frameworks

- Next.js ^16.2.0 - Full-stack React framework (App Router). Config in `next.config.ts`
- React ^19.0.0 / React DOM ^19.0.0 - UI library
- Tailwind CSS ^4.2.1 - Styling (via `@tailwindcss/postcss`, `postcss.config.mjs`)
- shadcn/ui ^3.8.5 - Component scaffolding (`components.json`)
- `tsx` ^4.21.0 with Node's built-in test runner - Runs `*.spec.ts` files in `modules/` and `lib/` (`yarn test` → `tsx --test`)
- TypeScript ^5 - Type checking (`yarn typecheck` → `tsc --noEmit`)
- ESLint ^9 - Linting (`eslint.config.mjs`, `eslint-config-next` 15.3.1)
- PostCSS ^8 - CSS processing
- tw-animate-css ^1.4.0 - Tailwind animation utilities

## Key Dependencies

- `@supabase/supabase-js` (latest) - Supabase database/auth/storage client
- `@supabase/ssr` (latest) - Cookie-based Supabase auth for SSR (server, client, proxy)
- `groq-sdk` ^0.37.0 - Groq LLM API client (chat completions + Whisper audio transcription)
- `@falaped/falaped-kit` 0.2.7 - Internal shared kit; provides PDF generation (`/pdf` subpath) and clinical helpers
- `zod` ^4.3.6 - Schema validation (env parsing in `lib/env.ts`, form/data schemas in `lib/schemas/`)
- `react-hook-form` ^7.71.2 + `@hookform/resolvers` ^5.2.2 - Form state and Zod resolver integration
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
- `pdfkit` - PDF rendering (declared as `serverExternalPackages` in `next.config.ts`; used transitively via `@falaped/falaped-kit/pdf`)

## Configuration

- Validated at startup via Zod schema in `lib/env.ts` (throws on invalid/missing required vars)
- `.env.local` (gitignored, present), `.env.example` template (`GROQ_ASSISTANT_MODEL` only)
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Optional: `GROQ_API_KEY`, `GROQ_ASSISTANT_MODEL` (default `qwen/qwen3-32b`), `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV`
- `VERCEL_URL` consumed in `app/layout.tsx` for metadata base URL
- `next.config.ts` - `cacheComponents: true`, `serverExternalPackages: ["pdfkit"]`, Server Actions `bodySizeLimit: "25mb"` (audio uploads)
- `tsconfig.json` - strict mode, `bundler` module resolution, path alias `@/*` → `./*`
- `postcss.config.mjs`, `eslint.config.mjs`, `components.json` (shadcn config)

## Platform Requirements

- Node.js (compatible with `@types/node` ^20)
- Yarn 1.x (Classic)
- Supabase project (URL + publishable key) for full functionality
- Groq API key for AI assistant / transcription features
- Vercel (target deployment; `VERCEL_URL` referenced, `.vercel` gitignored, README is Supabase + Vercel starter)
- Supabase (hosted Postgres + Auth + Storage)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Tooling

- Next.js 16 / React 19 / TypeScript 5 with `strict: true` (`tsconfig.json`)
- ESLint only (`eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`) — no Prettier, no Biome
- Path alias `@/*` → repo root; always import via `@/`

## Formatting

- 2-space indentation, double quotes throughout
- **Semicolon split (match the file you're editing):**
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

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern Overview

```

```

## Layers

- App Router pages under `app/dashboard/*` (cases, patients, prescriptions, medical-certificates, discussions, templates, profile, link-whatsapp)
- Auth flow pages under `app/auth/*`
- Feature components in `components/dashboard/<domain>/`, shadcn primitives in `components/ui/`
- `"use server"` functions, one domain per directory with `index.ts` barrels plus root `actions/index.ts`
- Every action: builds a per-request Supabase client → calls `getAuthenticatedUser(supabase)` → gates on `profile.status === "paid"` → validates input with Zod → delegates to `modules/`
- Returns discriminated result unions: `{ ok: true, ... } | { ok: false, error: string }`
- One exported function per file, organized by domain (`modules/cases/`, `modules/patients/`, `modules/prescriptions/`, etc.)
- Receives `SupabaseClient` by injection — never constructs clients, never imports `next/cache` or `next/headers`
- Throws `Error("[DOMAIN] ...")` on failure; actions catch and convert to result unions
- `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/proxy.ts` — per-request client factories (never global; Fluid-compute constraint documented in `lib/supabase/server.ts`)
- `lib/env.ts` — Zod-validated env at import time
- `lib/schemas/` — shared Zod schemas; `lib/pdf/` — PDF helpers over `@falaped/falaped-kit/pdf`

## Data Flow

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

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| auth-flow | Fluxo de autenticação Supabase Auth (auth.users → profiles → authenticated_users, user_phone, middleware). Use ao implementar login, proteger rotas, resolver user_phone ou ao falar de autenticação no dashboard. | `.cursor/skills/auth-flow/SKILL.md` |
| code-refactoring | Analisa domínios, módulos, pastas ou fluxos do FALAPED para identificar oportunidades de refatoração com base nas rules e convenções do projeto. Gera relatório estruturado por categoria e implementa após aprovação. Use quando o usuário pedir refatoração, revisão de código, limpeza, melhoria de qualidade, ou análise de débito técnico em um módulo, pasta ou fluxo. | `.cursor/skills/code-refactoring/SKILL.md` |
| creative-director-falaped | Guia o agente no papel de Creative Director em novas demandas: obriga rodadas de perguntas de UI/UX ao usuário antes de brief ou recomendações fechadas; alinha à identidade visual do FALAPED (tokens, Shadcn, dashboard). Complementa feature-planning-agile-po. Use quando o usuário pedir direção criativa, UX da feature, layout, estados de tela, acessibilidade ou planejar feature com foco em design. | `.cursor/skills/creative-director-falaped/SKILL.md` |
| dashboard-falaped |  | `.cursor/skills/dashboard-falaped/SKILL.md` |
| dependency-stack | Dependências principais do dashboard FALAPED (Next, Supabase, react-query, Zod, Tailwind). Use ao adicionar ou trocar pacotes, ou ao falar de stack e libs do projeto. | `.cursor/skills/dependency-stack/SKILL.md` |
| feature-planning-agile-po | Guia o agente no papel de Agile Master e Product Owner em discovery e especificação de features. Obriga rodadas de perguntas ao usuário antes de PRD ou user stories; depois produz PRD em Markdown com US, priorização (MoSCoW ou impacto × esforço) e riscos. Use quando o usuário pedir PRD, documento de requisitos, planejar feature, especificação, user stories, refinar backlog, priorizar, levantar riscos, discovery, PO ou Agile Master. | `.cursor/skills/feature-planning-agile-po/SKILL.md` |
| pediatric-dashboard-design |  | `.cursor/skills/pediatric-dashboard-design/SKILL.md` |
| prompt-engineering | Validates, refactors, and creates LLM prompts following OpenAI and Groq best practices. Use when writing system/user prompts, reviewing existing prompts, creating new AI instructions, or when the user mentions prompt engineering, prompt quality, prompt validation, or prompt refactoring. | `.cursor/skills/prompt-engineering/SKILL.md` |
| storage-pdfs | Supabase Storage para PDFs de relatório (bucket report-pdfs, signed URLs, paths). Use ao listar, baixar ou referenciar PDFs de relatório por caso. | `.cursor/skills/storage-pdfs/SKILL.md` |
| supabase-falaped | Define onde e como criar queries Supabase no dashboard FALAPED (uma query por arquivo em modules/{domain}, client como primeiro argumento). Use ao criar ou alterar queries, adicionar tabelas, migrations ou ao falar de Supabase, authenticated_users, cases, case_messages, patients neste projeto. | `.cursor/skills/supabase-falaped/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

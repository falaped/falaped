# External Integrations

**Analysis Date:** 2026-06-04

## APIs & External Services

**AI / LLM (Groq):**
- Groq Cloud API - LLM chat completions and audio transcription
  - SDK/Client: `groq-sdk` ^0.37.0, instantiated in `modules/groq/groq-client.ts` (baseURL `https://api.groq.com`)
  - Auth: `GROQ_API_KEY` (optional in env schema; required at call time)
  - Default model: `GROQ_ASSISTANT_MODEL` (env, default `qwen/qwen3-32b`; `.env.example` sets `openai/gpt-oss-120b`)
  - Usage: clinical assistant pipeline (`modules/falaped-assistant/`), case-report generation, summaries, classification, polishing (`modules/groq/assistant-*.ts`, `generate-case-report.ts`, `improve-report-section.ts`)
  - Audio: Whisper `whisper-large-v3` transcription in `modules/groq/transcribe-audio.ts` (Portuguese, with caption-hallucination guard)

**Internal Shared Kit (@falaped/falaped-kit 0.2.7):**
- Provides PDF generation and clinical helpers
  - PDF: `@falaped/falaped-kit/pdf` used in `modules/prescriptions/generate-prescription-pdf.ts` and `modules/medical-certificates/generate-medical-certificate-pdf.ts`
  - Clinical text helpers: `modules/groq/lib/split-patient-context.ts`, `modules/groq/generate-case-report.ts`

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Clients:
    - `lib/supabase/server.ts` - SSR server client (cookies)
    - `lib/supabase/client.ts` - Browser client
    - `lib/supabase/proxy.ts` - Proxy/session refresh client
    - `lib/supabase/server-admin.ts` - Service-role admin client (requires `SUPABASE_SERVICE_ROLE_KEY`; server-only, e.g. `auth.admin.deleteUser`)
  - Schema: migrations in `supabase/migrations/` (profiles, patients, cases, case_reports, medical_certificates, prescriptions, prescription_templates, phone_link_codes, discussions, etc.)
  - Seeds: `supabase/seed.sql`, `supabase/seed-atestados-receitas.sql`

**File Storage:**
- Supabase Storage (buckets defined in `lib/constants.ts`)
  - `PROFILE_LOGOS_BUCKET` - profile/clinic logos (public URL), `modules/profiles/upload-profile-logo.ts`
  - `PRESCRIPTIONS_BUCKET` - prescription PDFs, `modules/prescriptions/upload-prescription-pdf.ts`
  - `MEDICAL_CERTIFICATES_BUCKET` - medical certificate PDFs, `modules/medical-certificates/upload-medical-certificate-pdf.ts`
  - RLS policies for storage in migrations (`*_storage_*_rls.sql`, `*_storage_prescriptions.sql`, `*_storage_medical_certificates.sql`)

**Caching:**
- Next.js `cacheComponents` (enabled in `next.config.ts`); no external cache (Redis/etc.) detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (cookie-based via `@supabase/ssr`)
  - Email/password sign-up: `modules/supabase/sign-up-with-email.ts` (stores `full_name` and phone in user_metadata)
  - Email OTP confirmation: `app/auth/confirm/route.ts` (`auth.verifyOtp`)
  - Current user retrieval: `modules/supabase/get-authenticated-user.ts`
  - Session refresh on every request: `proxy.ts` → `lib/supabase/proxy.ts` (`updateSession`)
  - Account deletion (admin): `actions/profile/delete-account.ts` via service-role client
  - Profile lifecycle triggers in migrations (create/delete profile on auth user signup/delete, cascade delete)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Datadog/etc.). Errors surfaced via thrown `Error` and `sonner` toasts (`lib/get-friendly-toast-message.ts`)

**Logs:**
- Console-based; module-prefixed error messages (e.g. `[SUPABASE]`, `[PHONE_LINK_CODES]`)

## CI/CD & Deployment

**Hosting:**
- Vercel (target; `VERCEL_URL` referenced in `app/layout.tsx`, `.vercel` in `.gitignore`)

**CI Pipeline:**
- None detected (no `.github/workflows`, no other CI config files)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/publishable key

**Optional env vars:**
- `GROQ_API_KEY` - Groq LLM/transcription API key
- `GROQ_ASSISTANT_MODEL` - LLM model id (default `qwen/qwen3-32b`)
- `SUPABASE_SERVICE_ROLE_KEY` - Service-role key for admin operations
- `NODE_ENV` - `development` | `test` | `production`
- `VERCEL_URL` - Provided by Vercel at deploy time

**Secrets location:**
- `.env.local` (gitignored, present locally); validated by `lib/env.ts`. On Vercel, set via project env vars. NEVER commit `.env`/`.env*.local`

## Webhooks & Callbacks

**Incoming:**
- `app/auth/confirm/route.ts` (GET) - Supabase email OTP confirmation callback
- `app/api/prescriptions/[id]/download/route.ts` - prescription PDF download
- `app/api/medical-certificates/[id]/download/route.ts` - medical certificate PDF download

**Outgoing:**
- Groq API calls (chat completions, audio transcription) — `modules/groq/*`
- WhatsApp linking: app generates a 6-digit code (`modules/phone-link-codes/create-link-code.ts`, `actions/link-whatsapp/`) that an external WhatsApp bot validates to link a phone to a `profile_id`. The bot itself lives outside this repo; no outgoing WhatsApp API call is made from this codebase.

---

*Integration audit: 2026-06-04*

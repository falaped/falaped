# Stack Research

**Domain:** Secure patient share-links, patient timeline, Supabase RLS hardening
**Researched:** 2026-06-04
**Confidence:** HIGH

## Summary Verdict

Zero new npm dependencies required. Every capability needed — expiring share tokens, unauthenticated PDF delivery, RLS enforcement, and timeline aggregation — is achievable with Supabase primitives already installed in the project (`@supabase/supabase-js`, `@supabase/ssr`) plus plain SQL migrations.

---

## Recommended Stack

### Core Technologies

All three features use the existing stack unchanged:

| Technology | Current Version | Role in New Features | Why No Change Needed |
|------------|-----------------|----------------------|----------------------|
| `@supabase/supabase-js` | latest (pinned) | Token table CRUD, `createSignedUrl`, RLS policy author | Storage client already has full signed-URL API; JS client respects RLS transparently |
| `@supabase/ssr` | latest (pinned) | SSR server client for share-link route (unauthenticated session) | `createServerClient` with anon key works for public routes; no auth cookie needed |
| PostgreSQL (Supabase) | managed | `patient_share_tokens` table; RLS `ALTER TABLE … ENABLE ROW LEVEL SECURITY`; timeline `UNION ALL` view | All primitives are standard Postgres; no extension needed |
| Next.js App Router | ^16.2.0 | `/share/[token]` public route; `/dashboard/patients/[id]/timeline` server component | Route already supports unauthenticated rendering via `generateStaticParams`-free dynamic segments |

### Feature-Specific Decisions

#### 1. Secure Patient Share Links

**Pattern: server-side token table + Supabase Storage signed URL (NOT long-lived public bucket)**

The project already uses `supabase.storage.from(bucket).createSignedUrl(path, seconds)` in both download routes (60-second TTL, doctor-authed). The share-link flow needs the same call, but:

- A patient has no Supabase Auth session.
- The token validation and signed-URL generation must happen in a Next.js Route Handler using the **service-role client** (`lib/supabase/server-admin.ts`) — the one that bypasses RLS — so the lookup on `patient_share_tokens` and the storage sign happen server-side without an authenticated session.
- The signed URL itself is delivered as an HTTP redirect (same 302 pattern the existing routes use), so the patient's browser never holds the Supabase storage credential.

**Token table schema (new migration):**

```sql
create table public.patient_share_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- which document this unlocks
  document_type text not null check (document_type in ('prescription', 'medical_certificate')),
  document_id   uuid not null,
  pdf_storage_path text not null,
  -- expiry: doctor chooses TTL; no Supabase constraint on signed URL seconds
  expires_at timestamptz not null,
  -- one-time use optional hardening
  used_at    timestamptz null,
  created_at timestamptz not null default now()
);

create index idx_pst_token on public.patient_share_tokens (token) where used_at is null;
```

This follows the exact pattern of `phone_link_codes` already in the project (same columns: token/code, profile_id FK, expires_at, used_at).

**Signed URL TTL for patient share:** Use a long TTL (e.g., `7 * 24 * 3600 = 604800` seconds / 7 days) when generating the Supabase Storage signed URL at share-link redemption time. Supabase Storage has no documented hard maximum on `expiresIn` seconds (the API accepts any integer). The token table's `expires_at` is the real gate — the route handler checks `expires_at > now()` before calling `createSignedUrl`, so the storage URL can be short-lived (1 hour = `3600`) and regenerated on every redemption. Prefer short storage TTL + re-sign-on-access over issuing a 7-day storage URL to avoid unrevokable URLs if the patient link is revoked.

**Route:** `GET /api/share/[token]` — public route handler, no auth middleware, uses admin client, checks `expires_at`, signs the PDF, 302 redirect.

**RLS on `patient_share_tokens`:** Enable RLS. Doctors (authenticated) can INSERT/SELECT/DELETE their own tokens (`profile_id = (select id from profiles where auth_user_id = auth.uid())`). The public share route uses the service-role client, which bypasses RLS — no `anon` policy needed on this table.

#### 2. RLS on Existing Data Tables

**Pattern: `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` per table in an additive migration**

Tables requiring RLS (no RLS currently, confirmed by codebase audit in PROJECT.md):
- `public.patients`
- `public.cases`
- `public.case_reports`
- `public.prescriptions`
- `public.medical_certificates`
- `public.prescription_templates`
- `public.phone_link_codes`
- `public.discussions`

Already have RLS:
- `storage.objects` for `prescriptions`, `medical-certificates`, and `profile-logos` buckets (existing migrations)

**Policy pattern for all doctor-owned tables:**

```sql
alter table public.prescriptions enable row level security;

create policy "Prescriptions: owner select"
on public.prescriptions for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = (select auth.uid())
  )
);
-- Repeat for insert (with check), update (using + with check), delete (using).
```

**Critical compatibility constraint:** The service-role client (`lib/supabase/server-admin.ts`) bypasses RLS by definition. The SSR server client (`lib/supabase/server.ts`) operates as `authenticated` role — it already filters by `profile_id = profile.id` in application code. RLS will be a redundant guard, not a breaking change, as long as every existing module injects the correct profile_id. The IDOR bug (delete without profile_id filter) is exactly what RLS will silently fix as a safety net.

**No new dependencies:** This is pure SQL in migration files. The `supabase` CLI (`supabase db push` / `supabase migration new`) is already used for migration management.

#### 3. Patient Timeline View

**Pattern: Postgres `UNION ALL` query served via a Supabase RPC or a direct `.from()` call on a view — zero new dependencies**

The timeline needs events across `cases`, `prescriptions`, and `medical_certificates`, unified and sorted by date. Three options, all zero-dep:

**Option A (recommended): PostgreSQL view + RLS**

```sql
create or replace view public.patient_timeline as
  select
    'case'           as event_type,
    c.id             as event_id,
    c.patient_id,
    c.profile_id,
    c.created_at     as event_at,
    null::text        as pdf_storage_path
  from public.cases c
  union all
  select
    'prescription'   as event_type,
    p.id,
    p.patient_id,
    p.profile_id,
    p.created_at,
    p.pdf_storage_path
  from public.prescriptions p
  union all
  select
    'medical_certificate' as event_type,
    mc.id,
    mc.patient_id,
    mc.profile_id,
    mc.created_at,
    mc.pdf_storage_path
  from public.medical_certificates mc;
```

Call from server component:

```typescript
const { data } = await supabase
  .from('patient_timeline')
  .select('*')
  .eq('patient_id', patientId)
  .order('event_at', { ascending: false })
```

RLS on the view inherits from underlying tables once they have RLS enabled (Postgres security_barrier view behavior). Alternatively, apply a policy directly to the view.

**Option B: Supabase RPC (Postgres function)**

Wrap the `UNION ALL` in a `security definer` function — gives more control over returned columns and allows filtering by patient without exposing raw tables. Slightly more complex but better for large data.

**Option C: Three parallel queries in the server component**

Query `cases`, `prescriptions`, `medical_certificates` separately with `.eq('patient_id', id)`, merge and sort in TypeScript. Zero SQL complexity, works immediately with RLS. Acceptable at low data volumes. Choose this if Option A risks view-RLS confusion during RLS rollout.

**Recommendation:** Start with Option C (three parallel queries, merge in TS) during the same phase as RLS enablement to avoid view-RLS interactions during rollout. Migrate to Option A (view) in a later cleanup once RLS is stable and verified.

---

### Supporting Libraries

No new packages. The following existing packages cover all needs:

| Library | Existing Version | New Role |
|---------|-----------------|----------|
| `date-fns` | ^4.1.0 | Timeline sort/format (`differenceInDays`, `formatRelative` for PT-BR display) |
| `zod` | ^4.3.6 | Validate `token` path param in share route handler; validate `document_type` enum |
| `sonner` | ^2.0.7 | Toast when doctor copies share link |
| `lucide-react` | ^0.511.0 | Timeline icons (pill, stethoscope, file-text) |

### Development Tools

No new tools. Existing `supabase` CLI handles migrations. Existing `tsx` test runner handles module tests.

---

## Installation

No new packages to install.

The only change to tracked files is adding environment-level configuration for the share-link base URL:

```typescript
// lib/env.ts — add to Zod schema:
NEXT_PUBLIC_APP_URL: z.string().url(),
// Used to construct the share link: `${env.NEXT_PUBLIC_APP_URL}/share/${token}`
```

Add `NEXT_PUBLIC_APP_URL` to `.env.local` and Vercel project env vars. On Vercel, `VERCEL_URL` is already available but lacks the scheme; `NEXT_PUBLIC_APP_URL` as an explicit var is cleaner and matches the existing env pattern.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Token table (`patient_share_tokens`) + service-role redemption | Supabase Storage long-lived signed URL embedded directly in share link | Long-lived URLs are unrevokable; no way to expire early if patient contact changes; token table gives audit trail and explicit revocation |
| Token table pattern | JWT signed by app secret | Requires a signing library; no revocation without a denylist; defeats zero-new-dependency goal; token table already has a precedent in `phone_link_codes` |
| Short storage TTL + re-sign on every redemption | Long storage TTL (7 days) in the signed URL | Short TTL means even a leaked signed URL expires quickly; storage URL theft window is bounded to 1 hour |
| Three parallel TS queries for timeline (Phase 1) | Postgres UNION ALL view | View RLS semantics are more complex to verify during an RLS rollout; TS merge is easier to test and understand; migrate to view later |
| `NEXT_PUBLIC_APP_URL` env var for share link base | `VERCEL_URL` | `VERCEL_URL` has no scheme; varies per preview deploy; explicit env var is cleaner |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-query` / `@tanstack/query` | PROJECT.md constraint: no new data-fetching deps without explicit decision | Server components + server actions already handle data fetching; timeline fits a single async server component |
| `jsonwebtoken` / `jose` for share tokens | Adds a signing dependency; no revocation without denylist; `phone_link_codes` precedent shows Postgres token table is the project's pattern | `crypto.randomBytes` via Postgres `gen_random_bytes(32)` in `DEFAULT` clause |
| Making storage buckets public | Irreversible; all objects become unauthenticated forever; no per-document control | Keep buckets private; serve via signed URLs generated by the token redemption route |
| Supabase Edge Functions for share-link validation | Additional infra surface; cold starts; harder to test locally | Next.js Route Handler with admin client — same security, fits existing architecture |
| `pg` / `postgres` direct DB client | Bypasses Supabase client layer; RLS only enforced through Supabase Auth JWT; breaks consistency | `@supabase/supabase-js` with service-role for admin ops |
| `RLS FORCE` / disabling RLS then re-enabling | Data loss risk during migration; breaks during deployment window | Additive: `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + create policies in same migration; safe on live data |

---

## Stack Patterns by Variant

**If share link must be revokable by the doctor before expiry:**
- Add `revoked_at timestamptz null` to `patient_share_tokens`. Route handler checks `revoked_at IS NULL AND expires_at > now()`. Zero additional dependency.

**If timeline needs case_reports in addition to cases/prescriptions/certificates:**
- Add a fourth arm to the `UNION ALL` or fourth parallel query for `case_reports`. Same pattern, same zero-dep approach. `case_reports` already has `profile_id` and `case_id` (which joins to `patient_id` via `cases`).

**If the doctor wants to send the share link via WhatsApp:**
- No new integration needed. The existing WhatsApp bot pattern is out-of-scope. The doctor copies the URL from the dashboard (`navigator.clipboard.writeText`) and pastes it into WhatsApp manually. The `sonner` toast confirms the copy.

**If RLS enablement breaks an existing query during rollout:**
- The service-role admin client (`lib/supabase/server-admin.ts`) bypasses RLS by design and can be used temporarily on any broken path while fixing the policy. Do NOT use admin client as a permanent workaround — fix the policy.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@supabase/supabase-js` latest | `@supabase/ssr` latest | Both already installed and pinned together; no change |
| `createSignedUrl(path, seconds)` | No hard maximum on `seconds` | Verified from Supabase Storage API schema (`expiresIn: number`); use short TTL (3600) re-signed on each redemption for revokability |
| RLS on `public.*` tables | `service_role` client bypasses automatically | Confirmed: service_role has `bypassrls` privilege in Supabase-managed Postgres |
| Postgres `UNION ALL` view + RLS | Supabase `@supabase/supabase-js` `.from(view)` | Works as long as the view is not marked `security_invoker = true` (default is `security_definer`-equivalent for simple views) |
| `gen_random_bytes(32)` | pgcrypto | pgcrypto is enabled by default in all Supabase projects |

---

## Sources

- `/supabase/supabase` (Context7) — `storage createSignedUrl`, `RLS enable`, `anon vs authenticated policies`, `service_role bypass`
- Supabase Storage API schema (`supabase/packages/api-types/types/platform.d.ts`) — `GetSignedUrlBody: { expiresIn: number }` — confirmed no maximum
- `/Users/goker1/falaped/supabase/migrations/20260228130000_phone_link_codes.sql` — token table pattern reference (project-internal, HIGH confidence)
- `/Users/goker1/falaped/app/api/prescriptions/[id]/download/route.ts` — existing `createSignedUrl` usage (project-internal, HIGH confidence)
- `/Users/goker1/falaped/supabase/migrations/20260315010000_storage_prescriptions.sql` — existing RLS policy pattern for storage (project-internal, HIGH confidence)

---

*Stack research for: secure patient share-links, Supabase RLS hardening, patient timeline*
*Researched: 2026-06-04*

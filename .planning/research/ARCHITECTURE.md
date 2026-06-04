# Architecture Research

**Domain:** Secure share-links, patient timeline, Supabase RLS hardening — integration into existing layered Next.js + Supabase app
**Researched:** 2026-06-04
**Confidence:** HIGH (codebase read directly; Supabase and Next.js docs verified via Context7)

---

## Standard Architecture

### System Overview (existing + new layers)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  proxy.ts (middleware)                                                    │
│  matcher: all paths except _next/static, images, favicon                 │
│                                                                          │
│  EXISTING: unauthenticated → redirect /auth/login                        │
│  NEW:      /share/* paths added to "pass-through" exception list         │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
        ┌──────────────────────────┴──────────────────────────────┐
        │                                                          │
        ▼                                                          ▼
┌───────────────────┐                                  ┌───────────────────┐
│  /dashboard/**    │                                  │  /share/[token]   │
│  (authenticated)  │                                  │  (public/anon)    │
│  app/dashboard/   │                                  │  app/share/       │
│  SSR page         │                                  │  SSR page         │
└────────┬──────────┘                                  └────────┬──────────┘
         │                                                      │
         ▼                                                      ▼
┌───────────────────┐                                  ┌───────────────────┐
│  actions/ layer   │                                  │  app/api/share/   │
│  "use server"     │                                  │  [token]/route.ts │
│  auth gate +      │                                  │  (binary redirect)│
│  paid gate + Zod  │                                  │  anon client +    │
└────────┬──────────┘                                  │  token validation │
         │                                             └────────┬──────────┘
         ▼                                                      │
┌───────────────────────────────────────────────────────────────┴──────────┐
│  modules/ layer   (injected SupabaseClient — no auth, no next/headers)    │
│                                                                           │
│  EXISTING                    NEW                                          │
│  modules/patients/           modules/share-links/validate-share-token.ts  │
│  modules/cases/              modules/share-links/create-share-link.ts     │
│  modules/prescriptions/      modules/share-links/expire-share-token.ts    │
│  modules/medical-certs/      modules/patients/get-patient-timeline.ts     │
└──────────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Supabase Postgres (RLS-enforced after migration)                         │
│                                                                           │
│  EXISTING TABLES (no RLS today)     NEW TABLE                            │
│  profiles, authenticated_users      share_links                           │
│  patients, cases, case_messages     (token, resource_type, resource_id,  │
│  case_reports, prescriptions        profile_id, expires_at, used_at)     │
│  medical_certificates                                                     │
│  prescription_templates             RLS: anon SELECT WHERE               │
│  report_templates                   token = :token AND expires_at > now() │
│                                                                           │
│  STORAGE (already has RLS)                                               │
│  prescriptions bucket, medical-certificates bucket                       │
│  → signed URL generation server-side only                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|---------------|-----------------|
| `proxy.ts` matcher | Decide which paths run session refresh logic | **Modified** — add `/share` to pass-through |
| `lib/supabase/proxy.ts` `updateSession` | Redirect unauthenticated users to `/auth/login` | **Modified** — add `isShareRoute` guard |
| `app/share/[token]/page.tsx` | SSR page rendering share link UI (patient-facing) | **New** |
| `app/api/share/[token]/download/route.ts` | Binary redirect to signed storage URL; validates token | **New** |
| `actions/share-links/` | Create share link (authenticated doctor); uses auth gate | **New** |
| `modules/share-links/` | Token CRUD logic; injected SupabaseClient | **New** |
| `modules/patients/get-patient-timeline.ts` | Single aggregated query: cases + prescriptions + certs | **New** |
| `supabase/migrations/` | RLS enable + policies + share_links table | **New migrations** |

---

## Recommended Project Structure (additions only)

```
falaped/
├── app/
│   ├── share/
│   │   └── [token]/
│   │       └── page.tsx              # Public SSR: validate token, render download UI
│   └── api/
│       └── share/
│           └── [token]/
│               └── download/
│                   └── route.ts      # Binary: validate token → signed URL redirect
├── actions/
│   └── share-links/
│       ├── create-share-link.ts      # Auth-gated; creates token row
│       ├── revoke-share-link.ts      # Auth-gated; sets used_at/expires_at to now
│       └── index.ts                  # Barrel
├── modules/
│   ├── share-links/
│   │   ├── create-share-token.ts     # INSERT share_links row; returns token
│   │   ├── validate-share-token.ts   # SELECT by token WHERE expires_at > now()
│   │   └── types.ts
│   └── patients/
│       └── get-patient-timeline.ts   # NEW: aggregated query for timeline
├── components/
│   └── share/
│       └── share-download-card.tsx   # Patient-facing download UI
└── supabase/
    └── migrations/
        ├── 20260604000000_enable_rls_data_tables.sql     # Enable RLS + policies
        └── 20260604010000_share_links.sql                # share_links table + RLS
```

---

## Architectural Patterns

### Pattern 1: Public Route Middleware Carve-out

**What:** The middleware (`proxy.ts`) currently matches every path except static files and calls `updateSession` which redirects unauthenticated users to `/auth/login`. Public share routes must bypass this redirect while still refreshing the session cookie for any ambient authenticated user.

**When to use:** Any path that is intentionally unauthenticated but must run in the middleware for cookie hygiene.

**Implementation:**

In `lib/supabase/proxy.ts` `updateSession`, add a check before the unauthenticated redirect:

```typescript
const isShareRoute = pathname.startsWith("/share/") || pathname.startsWith("/api/share/");

// Unauthenticated user: redirect protected routes to login
if (!user && !isHomePage && !pathname.startsWith("/auth") && !isShareRoute) {
  await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  // ... redirect
}
```

The matcher in `proxy.ts` does not need to change — the session refresh call itself is harmless for anon users (it just finds no session), and returning `supabaseResponse` without redirect allows the share page to render.

**Trade-offs:** Keeps middleware logic in one place. Share routes still run the Supabase session check (negligible cost). Alternative — adding `/share` to the matcher exclusion — would prevent session refresh for doctors who happen to visit while logged in, which is worse UX.

---

### Pattern 2: Token-Validated Public Route Handler

**What:** `app/api/share/[token]/download/route.ts` uses an **anon Supabase client** (no session, no cookies needed), validates the share token against the `share_links` table (RLS policy allows anon SELECT on non-expired rows), retrieves the `resource_type` and `resource_id`, and generates a short-lived signed storage URL — never exposing the storage path directly.

**When to use:** Any binary response triggered by a public token (no server action can serve a redirect response).

**Token validation flow:**

```
GET /api/share/[token]/download
  │
  ├─ createClient() — publishable-key client (no cookies)
  │   (anon role; RLS allows SELECT on share_links WHERE token = ? AND expires_at > now())
  │
  ├─ SELECT share_links WHERE token = :token AND expires_at > now() AND used_at IS NULL
  │   → not found → 404 "Link inválido ou expirado"
  │
  ├─ resolve resource: SELECT pdf_storage_path FROM prescriptions WHERE id = resource_id
  │   (uses admin client here — anon role has no SELECT on prescriptions without profile auth)
  │   → no path → 404
  │
  ├─ createAdminClient().storage.from(bucket).createSignedUrl(path, 300)
  │   (signed URL valid 5 minutes; patient redeems immediately)
  │
  ├─ optional: UPDATE share_links SET used_at = now() WHERE token = :token
  │   (single-use enforcement; use admin client for write)
  │
  └─ Response.redirect(signedUrl, 302)
```

**Why admin client for storage:** The `prescriptions` and `medical-certificates` storage buckets are private; their RLS policies require `authenticated` role. For the download route, the doctor is not the requestor — the patient is. Using the admin client server-side to generate a signed URL is correct and safe because: (a) it runs only on a validated token, (b) the URL expires in 300 seconds, (c) the service key never reaches the browser.

**Trade-offs:** Admin client used in a public route is acceptable only because the ownership assertion is enforced by the token (which was created by the owning doctor). The token row must store `profile_id` so a later audit trail is possible.

---

### Pattern 3: Share Link Creation (Authenticated Action)

**What:** A new server action `actions/share-links/create-share-link.ts` follows the standard action pattern (auth gate + paid gate + Zod) and calls `modules/share-links/create-share-token.ts`.

**Token design:** Use `gen_random_uuid()` as token — UUID v4 provides 122 bits of entropy, which is sufficient for an opaque token at this scale. Do not use sequential IDs.

**Expiry:** Default 7 days (`expires_at = now() + interval '7 days'`). Store as `timestamptz`.

**Schema:**

```sql
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null check (resource_type in ('prescription', 'medical_certificate')),
  resource_id uuid not null,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

-- RLS: anon can SELECT non-expired tokens (for validation in public download route)
alter table public.share_links enable row level security;

create policy "Share links anon select valid"
on public.share_links for select to anon
using (expires_at > now() AND used_at IS NULL);

-- Authenticated: doctor can select/insert/delete their own links
create policy "Share links owner all"
on public.share_links for all to authenticated
using (profile_id in (select id from public.profiles where auth_user_id = auth.uid()))
with check (profile_id in (select id from public.profiles where auth_user_id = auth.uid()));
```

**Module signature:**

```typescript
// modules/share-links/create-share-token.ts
export async function createShareToken(
  supabase: SupabaseClient,
  profileId: string,
  resourceType: "prescription" | "medical_certificate",
  resourceId: string,
  expiresInDays = 7,
): Promise<{ token: string; expiresAt: string }>
```

---

### Pattern 4: Patient Timeline Aggregation Query

**What:** A new module `modules/patients/get-patient-timeline.ts` fetches cases, prescriptions, and medical certificates for a given `patientId` + `profileId` in three parallel queries and merges them into a sorted array of typed timeline events.

**When to use:** Called from an authenticated server action for the doctor's patient detail page.

**Query structure (no SQL `UNION` needed — three parallel JS awaits):**

```typescript
// modules/patients/get-patient-timeline.ts
export type TimelineEventType = "case" | "prescription" | "medical_certificate";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  date: string;          // ISO string for sorting
  label: string;         // human-readable summary
  resourceUrl?: string;  // optional link for download
};

export async function getPatientTimeline(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
): Promise<TimelineEvent[]>
```

**Important:** `cases` are scoped by `user_phone`, not `profile_id` (see `getCasesByPatientId` — it resolves `phone` from `authenticated_users` first). The timeline module must replicate this phone-resolution pattern to avoid cross-tenant leakage. After RLS is enabled with a `user_phone`-based policy on `cases`, the app-layer phone filter becomes defense-in-depth rather than sole protection.

**Merge approach:** Fetch three arrays in parallel with `Promise.all`, map each to `TimelineEvent`, concatenate, sort by `date` descending. No SQL aggregation needed at this scale.

---

### Pattern 5: RLS Rollout Without Breaking Existing Clients

**What:** Enabling RLS on existing tables requires adding policies before enabling — otherwise all queries return empty results immediately. The existing clients are:

| Client | How it authenticates | Effect after RLS enable |
|--------|---------------------|------------------------|
| `lib/supabase/server.ts` `createClient()` | Session cookie → `authenticated` role | Works if `TO authenticated` policies exist |
| `lib/supabase/client.ts` (browser) | Session cookie → `authenticated` role | Works if `TO authenticated` policies exist |
| `lib/supabase/proxy.ts` middleware client | Session cookie | Only reads `auth.users` — unaffected |
| `lib/supabase/server-admin.ts` `createAdminClient()` | Service role key | **Bypasses RLS entirely** — unaffected |

**Safe rollout order per table:**

1. Write the migration with `enable row level security` AND all required policies in the same migration file.
2. Test with `createClient()` (publishable key, authenticated session) before deploying.
3. Never run `enable row level security` in one migration and the policies in another — the gap between creates a window of zero data access.

**Policy template for `profile_id`-scoped tables** (profiles, patients, cases_reports, prescriptions, medical_certificates, prescription_templates, report_templates):

```sql
alter table public.<table> enable row level security;

create policy "<Table> owner select"
on public.<table> for select to authenticated
using (profile_id in (
  select id from public.profiles where auth_user_id = auth.uid()
));

create policy "<Table> owner insert"
on public.<table> for insert to authenticated
with check (profile_id in (
  select id from public.profiles where auth_user_id = auth.uid()
));

create policy "<Table> owner update"
on public.<table> for update to authenticated
using (profile_id in (
  select id from public.profiles where auth_user_id = auth.uid()
))
with check (profile_id in (
  select id from public.profiles where auth_user_id = auth.uid()
));

create policy "<Table> owner delete"
on public.<table> for delete to authenticated
using (profile_id in (
  select id from public.profiles where auth_user_id = auth.uid()
));
```

**Policy template for `cases` table** (scoped by `user_phone`, not `profile_id`):

```sql
alter table public.cases enable row level security;

create policy "Cases owner select"
on public.cases for select to authenticated
using (user_phone in (
  select au.phone from public.authenticated_users au
  join public.profiles p on p.id = au.profile_id
  where p.auth_user_id = auth.uid()
));

-- insert/update/delete: same subquery on user_phone
```

**Policy template for `case_messages`** (scoped via `cases.user_phone`):

```sql
alter table public.case_messages enable row level security;

create policy "Case messages owner select"
on public.case_messages for select to authenticated
using (case_id in (
  select c.id from public.cases c
  join public.authenticated_users au on au.phone = c.user_phone
  join public.profiles p on p.id = au.profile_id
  where p.auth_user_id = auth.uid()
));
```

**`profiles` and `authenticated_users` tables:** These are already read by `getAuthenticatedUser`. After RLS enable, the policy must allow the row for `auth.uid()`:

```sql
alter table public.profiles enable row level security;

create policy "Profiles owner all"
on public.profiles for all to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

alter table public.authenticated_users enable row level security;

create policy "AuthUsers owner all"
on public.authenticated_users for all to authenticated
using (profile_id in (
  select id from public.profiles where auth_user_id = auth.uid()
))
with check (profile_id in (
  select id from public.profiles where auth_user_id = auth.uid()
));
```

**Subquery performance note:** The `auth_user_id = auth.uid()` lookup on `profiles` is O(1) with the primary key. The `user_phone` subquery on `cases` involves two joins — add a Postgres index on `authenticated_users(profile_id)` and `profiles(auth_user_id)` if not already present.

---

## Data Flow

### Share Link Creation Flow (Doctor)

```
Doctor clicks "Gerar link de compartilhamento"
  │
  ├─ Client component → createShareLinkAction(resourceType, resourceId)
  │
  ├─ actions/share-links/create-share-link.ts
  │   ├─ createClient() → getAuthenticatedUser() → paid gate
  │   ├─ Zod: validate resourceType ∈ ["prescription","medical_certificate"], resourceId UUID
  │   └─ createShareToken(supabase, profile.id, resourceType, resourceId)
  │
  ├─ modules/share-links/create-share-token.ts
  │   └─ INSERT share_links → return { token, expiresAt }
  │
  └─ Action returns { ok: true, shareUrl: `${env.NEXT_PUBLIC_APP_URL}/share/${token}` }
     UI copies URL to clipboard
```

### Share Link Redemption Flow (Patient)

```
Patient opens https://app.falaped.com.br/share/<token>
  │
  ├─ proxy.ts middleware: isShareRoute = true → no auth redirect → pass through
  │
  ├─ app/share/[token]/page.tsx (SSR)
  │   ├─ createClient() — anon, no cookies
  │   ├─ SELECT share_links WHERE token = ? (RLS: anon SELECT on valid tokens)
  │   ├─ found → render download button + document summary
  │   └─ not found / expired → render "link inválido ou expirado" UI
  │
  └─ Patient clicks download button
       ├─ GET /api/share/[token]/download/route.ts
       ├─ Validate token (anon client, RLS)
       ├─ Resolve pdf_storage_path (admin client)
       ├─ createAdminClient().storage.createSignedUrl(path, 300)
       ├─ Optional: UPDATE share_links SET used_at = now()
       └─ Response.redirect(signedUrl, 302)
```

### Patient Timeline Flow (Doctor)

```
Doctor opens /dashboard/patients/[id]
  │
  ├─ SSR page or server component calls getPatientTimelineAction(patientId)
  │
  ├─ actions/patients/get-patient-timeline.ts
  │   ├─ getAuthenticatedUser() → paid gate
  │   └─ getPatientTimeline(supabase, profile.id, patientId)
  │
  ├─ modules/patients/get-patient-timeline.ts
  │   ├─ Promise.all([
  │   │     getCasesByPatientId(supabase, profileId, patientId),
  │   │     getPrescriptionsByPatientId(supabase, profileId, patientId),
  │   │     getMedicalCertificatesByPatientId(supabase, profileId, patientId)
  │   │  ])
  │   ├─ Map each to TimelineEvent[]
  │   └─ Sort by date descending → return TimelineEvent[]
  │
  └─ Component renders chronological timeline
```

---

## Integration Points

### Modified Files

| File | Change |
|------|--------|
| `lib/supabase/proxy.ts` | Add `isShareRoute` guard before unauthenticated redirect |
| `modules/patients/` | Add `get-patient-timeline.ts`; add `get-medical-certificates-by-patient-id.ts` (if missing) |

### New Files

| File | Purpose |
|------|---------|
| `app/share/[token]/page.tsx` | Public SSR share page |
| `app/api/share/[token]/download/route.ts` | Binary download route |
| `actions/share-links/create-share-link.ts` | Doctor-facing share link creation |
| `actions/share-links/revoke-share-link.ts` | Revocation action |
| `actions/share-links/index.ts` | Barrel |
| `actions/patients/get-patient-timeline.ts` | Auth-gated timeline action |
| `modules/share-links/create-share-token.ts` | DB insert |
| `modules/share-links/validate-share-token.ts` | DB select (also used by public route) |
| `modules/share-links/types.ts` | ShareLink types |
| `components/share/share-download-card.tsx` | Patient-facing download UI |
| `supabase/migrations/20260604000000_enable_rls_data_tables.sql` | RLS enable + policies on all data tables |
| `supabase/migrations/20260604010000_share_links.sql` | share_links table + RLS |

### Environment Variables (new)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Used to construct the share URL (e.g. `https://app.falaped.com.br`). Add to `lib/env.ts` Zod schema. |

---

## Suggested Build Order

The ordering respects two hard constraints from PROJECT.md: (1) RLS + IDOR fix must ship before any share link can go live, and (2) timeline is independent of share links but shares the RLS prerequisite.

### Step 1 — Fix IDOR in existing delete modules (unblocks everything else)

- `modules/prescriptions/delete-prescription.ts`: add `.eq("profile_id", profileId)` and thread `profileId` from action
- `modules/medical-certificates/delete-medical-certificate.ts`: same
- `actions/prescriptions/delete-prescription.ts` and bulk: pass `profile.id` to module
- `actions/medical-certificates/delete-medical-certificate.ts` and bulk: same
- Replace admin client in delete actions with user-scoped client + storage RLS (already exists on storage buckets)
- Write ownership tests for delete actions (catches regressions from here forward)

### Step 2 — Enable RLS on all data tables (migration)

- Single migration: `enable row level security` + all SELECT/INSERT/UPDATE/DELETE policies for each table, in one atomic migration file
- Table order to reduce FK risk: `profiles` → `authenticated_users` → `patients` → `cases` → `case_messages` → `case_reports` → `prescriptions` → `medical_certificates` → `prescription_templates` → `report_templates`
- Test each client type: `createClient()` (SSR, browser), `createAdminClient()` (should still bypass RLS unchanged)
- Deploy to staging, run all 31 existing specs + new ownership tests

### Step 3 — `share_links` table + token module

- Migration: create `share_links` table with anon SELECT policy + authenticated owner-all policy
- `modules/share-links/create-share-token.ts` + `validate-share-token.ts` + types
- Unit tests: token creation, expiry check, used_at enforcement

### Step 4 — Public route infrastructure

- Modify `lib/supabase/proxy.ts`: add `isShareRoute` guard
- `app/share/[token]/page.tsx`: SSR page, anon Supabase client, no auth gate
- `app/api/share/[token]/download/route.ts`: token validation → admin client signed URL → redirect
- Add `NEXT_PUBLIC_APP_URL` to `lib/env.ts`

### Step 5 — Share link creation action + UI

- `actions/share-links/create-share-link.ts` (auth gate + Zod)
- `actions/share-links/revoke-share-link.ts`
- `components/share/share-download-card.tsx` (patient-facing)
- UI integration into prescription/certificate detail views (generate link button + copy-to-clipboard)

### Step 6 — Patient timeline

- `modules/patients/get-patient-timeline.ts` (parallel queries + merge)
- `actions/patients/get-patient-timeline.ts` (auth gate wrapper)
- Timeline component on `/dashboard/patients/[id]`
- Can be built in parallel with Steps 4–5 once Step 2 is done

---

## Anti-Patterns

### Anti-Pattern 1: Enabling RLS without policies in a separate migration

**What people do:** Run `alter table foo enable row level security` in one migration, then add policies in a second migration or manually.

**Why it's wrong:** Any deployment gap between the two migrations leaves the table returning zero rows for all publishable-key queries. In production this means silent data loss from the app's perspective — pages render empty, no error.

**Do this instead:** Always include `enable row level security` and all required policies in a single migration file. Test against a staging Supabase project before deploying.

---

### Anti-Pattern 2: Using the admin client for token validation in the public download route

**What people do:** Skip writing the anon RLS policy and instead use `createAdminClient()` for the token SELECT query, reasoning "it's simpler."

**Why it's wrong:** The admin client bypasses RLS entirely. If a bug introduces a path that skips the token check, the admin client gives full table access. The anon RLS policy on `share_links` is a security invariant — it enforces token validity + expiry at the database layer regardless of application logic.

**Do this instead:** Use an anon (publishable-key) Supabase client for the token validation SELECT. Use the admin client only for the subsequent storage signed URL generation (where the anon role genuinely cannot act).

---

### Anti-Pattern 3: Storing the PDF `pdf_storage_path` in the share link response

**What people do:** Return the storage path or a pre-generated signed URL in the `app/share/[token]/page.tsx` SSR response to avoid a second round-trip for the download.

**Why it's wrong:** The storage path itself is an opaque internal identifier, but embedding a signed URL in an SSR page makes it cacheable (CDN, browser) and hard to revoke. Signed URLs have no server-side revocation mechanism — expiry is the only control.

**Do this instead:** The SSR page renders only metadata (document type, issuing doctor name, patient first name). The actual signed URL is generated on demand by `GET /api/share/[token]/download` at click time with a short expiry (300 seconds). This keeps the signed URL uncacheable and respects single-use enforcement via `used_at`.

---

### Anti-Pattern 4: Proxy/middleware exclusion for `/share` paths

**What people do:** Add `/share` to the `matcher` exclusion in `proxy.ts` to prevent the middleware from running on share routes.

**Why it's wrong:** The Supabase `updateSession` call in the middleware refreshes session cookies for authenticated users on every request. Excluding `/share` from the matcher means a doctor who happens to visit their own share link while logged in will see their session cookie not refreshed — potentially causing premature logout. The correct fix is to leave `/share` in the matcher scope and add a path guard inside `updateSession` to skip the unauthenticated redirect.

**Do this instead:** Keep the matcher unchanged. Add `isShareRoute` check inside `updateSession` in `lib/supabase/proxy.ts` as shown in Pattern 1.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (few hundred doctors) | All queries are fine. RLS subqueries (`auth.uid()` → `profiles`) are fast with PK. |
| 1k–10k doctors, many share links | Add index on `share_links(token)` (already unique, so auto-indexed by PK uniqueness constraint). Add `share_links(expires_at)` index for cleanup queries. |
| High share link volume | Consider a background job to purge expired `share_links` rows. `used_at IS NOT NULL OR expires_at < now()` are candidates for deletion after 30 days. |

---

## Sources

- `lib/supabase/proxy.ts` — existing middleware session refresh logic (read directly)
- `app/api/prescriptions/[id]/download/route.ts` — existing pattern for auth-gated signed URL redirect (read directly)
- `modules/cases/get-cases-by-patient-id.ts` — existing `user_phone`-scoped case query pattern (read directly)
- `supabase/migrations/20260315010000_storage_prescriptions.sql` — existing storage RLS pattern (read directly)
- Supabase RLS docs — `enable row level security` + policy syntax (Context7 `/websites/supabase`, HIGH confidence)
- Supabase signed URL docs — `createSignedUrl(path, expiresIn)` (Context7 `/websites/supabase`, HIGH confidence)
- Next.js middleware matcher docs — negative regex exclusion pattern (Context7 `/vercel/next.js`, HIGH confidence)

---
*Architecture research for: Falaped v1.1 — share-links, timeline, RLS hardening*
*Researched: 2026-06-04*

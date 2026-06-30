# Architecture Research

**Domain:** Brazilian pediatric medical practice web app (Falaped) — brownfield feature integration
**Researched:** 2026-06-28
**Confidence:** HIGH (grounded in the existing codebase, not external research)

> **Scope:** This is a SUBSEQUENT MILESTONE on a mature brownfield app. The job is NOT to design a new architecture — it is to show HOW each new feature folds into the existing strict three-tier slice pattern. Every recommendation below mirrors a slice that already ships in production (`prescriptions`, `medical-certificates`, `prescription-templates`, `patients`, `cases`).

## Standard Architecture

### System Overview (existing — DO NOT change)

```
┌──────────────────────────────────────────────────────────────────┐
│  PRESENTATION  app/dashboard/<domain>/page.tsx + components/        │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐            │
│  │ page.tsx │ │  *-wizard │ │ *-table  │ │  *-card   │  (client)  │
│  └────┬─────┘ └─────┬─────┘ └────┬─────┘ └─────┬─────┘            │
│       └─────────────┴────────────┴─────────────┘                  │
│                         │ calls Server Action                      │
├─────────────────────────┼──────────────────────────────────────────┤
│  ACTION  actions/<domain>/*.ts  ("use server")                     │
│  createClient() → getAuthenticatedUser() → profile.status==="paid" │
│  → Zod validate → orchestrate modules → { ok } | { ok:false,error }│
├─────────────────────────┼──────────────────────────────────────────┤
│  DOMAIN  modules/<domain>/<verb-noun>.ts (one fn/file, injected SB)│
│  insert-* / get-*-by-profile-id / generate-*-pdf / upload-*-pdf    │
├─────────────────────────┼──────────────────────────────────────────┤
│  DATA   Supabase Postgres (RLS by profiles.auth_user_id=auth.uid())│
│         Supabase Storage (private buckets, {profile_id}/ folders)   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  + @falaped/falaped-kit/pdf│
│  │ tables   │ │ storage  │ │  Groq    │                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
└──────────────────────────────────────────────────────────────────┘

  Binary exception: app/api/<domain>/[id]/download/route.ts
  (owns-check → createSignedUrl → 302 redirect). PDFs only.
```

### Component Responsibilities (per slice — the unit you replicate)

| Component | Responsibility | Existing reference to copy |
|-----------|----------------|----------------------------|
| `app/dashboard/<domain>/page.tsx` + `new/` | Route + RSC data fetch + render wizard/list | `app/dashboard/prescriptions/` |
| `components/dashboard/<domain>/*-wizard.tsx` | Client form, calls action, downloads base64 PDF | `prescription-wizard.tsx` |
| `actions/<domain>/*.ts` | auth + paid gate + Zod + orchestrate; returns result union | `actions/prescriptions/generate-prescription.ts` |
| `modules/<domain>/insert-*.ts`, `get-*-by-profile-id.ts` | DB queries, scoped by `profile_id`, throw on error | `modules/prescriptions/*` |
| `modules/<domain>/generate-*-pdf.ts` | Build Buffer via `@falaped/falaped-kit/pdf` | `generate-prescription-pdf.ts` |
| `modules/<domain>/upload-*-pdf.ts` | `{profileId}/{id}.pdf` into private bucket | `upload-prescription-pdf.ts` |
| `app/api/<domain>/[id]/download/route.ts` | Owns-check → signed URL → 302 | `app/api/prescriptions/[id]/download/route.ts` |
| Migration `supabase/migrations/*.sql` | Table + indexes + `set_updated_at` trigger + **RLS in same file as the table going forward** | `20260315000000_prescriptions.sql` + `20260604000000_rls_prescriptions.sql` |

## Recommended Project Structure (new code locations)

```
app/dashboard/
├── documents/ or per-type dirs        # NEW: referrals, exam-requests, medical-reports
│   ├── referrals/{page.tsx,new/}
│   ├── exam-requests/{page.tsx,new/}
│   └── medical-reports/{page.tsx,new/}
├── vaccines/                          # NEW: reference calendar (read-only)
│   └── page.tsx
└── patients/[id]/                     # EXTEND: photo + vaccination card tab + timer

actions/
├── referrals/  exam-requests/  medical-reports/   # NEW doc slices (index.ts barrels)
├── orientation-templates/                          # NEW (mirror prescription-templates)
├── vaccinations/                                   # NEW (patient vaccination card)
└── patients/                                       # EXTEND: upload-patient-photo.ts

modules/
├── referrals/  exam-requests/  medical-reports/   # NEW: insert/get/generate-pdf/upload-pdf/types
├── orientation-templates/                          # NEW
├── vaccines/                                        # NEW: reference calendar logic + static data
│   ├── vaccine-calendar.ts        # static reference data (SUS + particular + gestante)
│   └── get-vaccine-schedule-for-age.ts
├── vaccinations/                                    # NEW: per-patient applied/pending records
└── patients/                                        # EXTEND: upload-patient-photo.ts

app/api/
├── referrals/[id]/download/route.ts               # NEW
├── exam-requests/[id]/download/route.ts           # NEW
└── medical-reports/[id]/download/route.ts         # NEW

lib/
├── constants.ts                                    # EXTEND: 4 new bucket names
└── schemas/                                         # NEW Zod schemas per doc type

supabase/migrations/                                # NEW migrations (table + RLS together)
```

### Structure Rationale

- **One directory per new document type** (`referrals`, `exam-requests`, `medical-reports`), not a single generic `documents` slice. The existing app already chose this: `prescriptions` and `medical-certificates` are separate slices despite sharing the exact same table shape. Following that precedent keeps wizards, Zod schemas, and PDF layouts type-specific and avoids a discriminated mega-payload. (`medical_certificates` does use a `type` enum internally for its four sub-variants — use that pattern only WITHIN a doc type, not across them.)
- **`orientation-templates` as its own slice, not a flag on `prescription-templates`.** PROJECT.md treats "biblioteca de templates só de orientações" and "receituário em branco" as distinct from prescription templates. A blank prescription is just the existing prescription wizard with an empty `medications[]`, so it needs NO new table. Orientation templates need their own table because they store only orientation text, not a full medication snapshot. (LOW-MEDIUM confidence on whether to instead add a `kind` column to `prescription_templates` — see Open Questions.)
- **`vaccines` (reference) vs `vaccinations` (per-patient) are deliberately split.** Reference calendar is read-only, identical for every doctor, and changes rarely → static TypeScript data in `modules/vaccines/`. The per-patient card is mutable, owned data → a real `profile_id`-scoped table with its own slice.
- **Patient photo and consultation timer are EXTENSIONS to existing slices** (`patients`, `cases`), not new slices — they have no document/PDF surface.

## Architectural Patterns

### Pattern 1: Document-type slice (referral / exam request / medical report)

**What:** Replicate the `prescriptions` slice end to end for each new clinical document.
**When to use:** Any artifact that is filled in a wizard, optionally saved as a template, and printed to PDF.
**Trade-offs:** Some boilerplate duplication across the three doc types, but each stays independently type-safe and the PDF layout is tunable per type (matches the existing prescriptions/atestados split — this is the house style, not accidental).

**New table (one per doc type, identical shape to `prescriptions`):**
```sql
-- e.g. 20260701000000_referrals.sql  (repeat for exam_requests, medical_reports)
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid null references public.patients(id) on delete set null,
  case_id   uuid null references public.cases(id)     on delete set null,
  payload   jsonb not null default '{}'::jsonb,        -- form fields per type
  location_state text null,
  issued_at date not null,
  pdf_storage_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_referrals_profile_id on public.referrals (profile_id);
create index idx_referrals_issued_at  on public.referrals (issued_at desc);
-- + set_updated_at trigger + RLS (4 policies, ownership via profiles.auth_user_id)
```

**Action flow (copy `generate-prescription.ts` almost verbatim):**
```typescript
export async function generateReferralAction(params): Promise<Result> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") return { ok: false, error: "..." }  // paid gate
  const parsed = referralSchema.safeParse(...)        // Zod
  const buffer = await generateReferralPdf({ payload, doctor, ... })  // kit
  const id     = await insertReferral(supabase, { profileId: profile.id, ... })
  const path   = await uploadReferralPdf(supabase, profile.id, id, buffer)
  await updateReferralPdfPath(supabase, id, path)
  return { ok: true, pdfBase64: buffer.toString("base64"), filename }
}
```

### Pattern 2: Private storage bucket per artifact (photos + PDFs)

**What:** One private bucket per artifact family, objects keyed `{profile_id}/...`, RLS matching `storage.foldername(name)[1]` against the caller's profile id.
**When to use:** Any binary owned by a doctor. Reuse for the 3 new PDF buckets and the patient-photo bucket.
**Trade-offs:** Private buckets need a signed-URL download route (no public URL) — already the established pattern for PDFs. Photos are a small wrinkle: they render in `<img>`, so either generate a signed URL server-side at render time (RSC) or add a thin download route. Do NOT make the photo bucket public (children's photos are sensitive — PROJECT.md constraint).

**New bucket constants (`lib/constants.ts`):**
```typescript
export const REFERRALS_BUCKET = "referrals"
export const EXAM_REQUESTS_BUCKET = "exam-requests"
export const MEDICAL_REPORTS_BUCKET = "medical-reports"
export const PATIENT_PHOTOS_BUCKET = "patient-photos"   // PRIVATE — sensitive
```

**Patient photo upload (Server Action, NOT a route handler — `bodySizeLimit` is 25mb):**
```typescript
// modules/patients/upload-patient-photo.ts  (mirror upload-profile-logo.ts but PRIVATE bucket)
export async function uploadPatientPhoto(supabase, profileId, patientId, file) {
  const path = `${profileId}/${patientId}.jpg`           // ownership-scoped key
  await supabase.storage.from(PATIENT_PHOTOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  return path                                            // store in patients.photo_storage_path
}
// patients table: ALTER TABLE patients ADD COLUMN photo_storage_path text null;
```
Display: in the patient detail RSC, call `createSignedUrl(photo_storage_path, 60)` and pass the URL to the client `<img>`. (MEDIUM confidence the signed-URL-at-render approach beats a route handler; both are valid — route handler matches the PDF precedent more closely if you prefer consistency.)

### Pattern 3: Static reference data vs owned mutable data (vaccines)

**What:** Split the vaccination feature in two. The **reference calendar** (SUS, particular, gestante) is the same for every user → ship it as a typed constant in `modules/vaccines/vaccine-calendar.ts`, no table, no migration, no RLS. The **per-patient card** is owned, mutable data → a `profile_id`-scoped table + slice.
**When to use:** Whenever data is (a) global and rarely-changing → static; (b) per-tenant and editable → table.
**Trade-offs:** Static data needs a code deploy to update the calendar — acceptable for an annual schedule and removes a whole CRUD surface, RLS, and seed-management burden. If the doctor must edit the calendar in-app later, promote it to a global read-only table then (defer — YAGNI).

**Reference (static):**
```typescript
// modules/vaccines/vaccine-calendar.ts
export const VACCINE_CALENDAR: VaccineDose[] = [
  { vaccine: "BCG", scheme: "sus", ageMonths: 0, dose: "única", ... },
  { vaccine: "Hepatite B", scheme: "sus", ageMonths: 0, dose: "ao nascer", ... },
  // ... particular doses, gestante doses (Hep B, dTpa, VSR, Influenza, COVID)
]
// modules/vaccines/get-vaccine-schedule-for-age.ts  → pure fn, gets a .spec.ts
```

**Per-patient card (owned table):**
```sql
-- 20260705000000_patient_vaccinations.sql
create table public.patient_vaccinations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade, -- ownership
  patient_id uuid not null references public.patients(id) on delete cascade,
  vaccine_key text not null,        -- joins to static calendar entry
  dose_label  text null,            -- e.g. "1ª dose", "reforço"
  applied_at  date null,            -- null = registered as planned/pending
  status text not null default 'applied',  -- 'applied' | 'pending' | 'late' (or derive late from age)
  lot text null, notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_patient_vaccinations_profile_id on public.patient_vaccinations (profile_id);
create index idx_patient_vaccinations_patient_id on public.patient_vaccinations (patient_id);
-- + set_updated_at trigger + RLS (4 policies on profile_id ownership)
```
"Pending / late" is computed at read time: compare the static calendar for the patient's age against the `applied` rows in `patient_vaccinations`. Don't materialize pending rows unless the doctor explicitly schedules one. (MEDIUM confidence — derive-on-read keeps the table to only real events and avoids a backfill job.)

### Pattern 4: Consultation timer — derive from `cases.started_at`, don't add UI-only state

**What:** The `cases` table ALREADY has `started_at` (and `ended_at`). A dashboard-originated case is created at consultation start. The timer's elapsed time = `now() - started_at`; the client just renders a ticking counter from that server-provided timestamp.
**When to use:** This case (a started_at column already exists — verified in `modules/cases/get-case-by-id.ts` `CaseDetail`).
**Trade-offs:** No new column needed for the common path. The timer is therefore **persisted-by-reuse, rendered client-side**: server sends `started_at`, client computes elapsed each second. Survives refresh, no extra writes. If the requirement is a manual start/pause distinct from case creation, add an explicit `consultation_started_at timestamptz` (and optional `consultation_ended_at`) to `cases` — but try the existing `started_at` first.

```typescript
// client component: counts up from a server timestamp, no persistence churn
const elapsed = useElapsed(case.started_at)   // now() - started_at, ticks each 1s
```

## Data Flow

### Document generation (referral / exam request / medical report) — identical to prescriptions

```
[Doctor fills wizard]  components/dashboard/referrals/referral-wizard.tsx
        ↓ generateReferralAction(payload, patientId?, caseId?)
[Action]  auth + paid gate + Zod  →  generateReferralPdf (kit) → Buffer
        ↓                              ↓                          ↓
   insertReferral ──────────────► uploadReferralPdf ──► updateReferralPdfPath
   (referrals row, profile_id)    ({profile_id}/{id}.pdf)   (pdf_storage_path)
        ↓
[Response { ok, pdfBase64, filename }]  → client triggers download
   Later re-download: GET /api/referrals/[id]/download → owns-check → signed URL → 302
```

### Patient photo

```
[Upload in patient form] → updatePatientAction / uploadPatientPhotoAction (Server Action, ≤25mb)
   → uploadPatientPhoto(supabase, profileId, patientId, file)  → PATIENT_PHOTOS_BUCKET (private)
   → set patients.photo_storage_path
[Render]  patient detail RSC → createSignedUrl(path,60) → <img src={signedUrl}>
```

### Vaccination card

```
[View card]  patient detail tab (RSC)
   → getPatientVaccinations(supabase, profileId, patientId)         (applied rows)
   → getVaccineScheduleForAge(VACCINE_CALENDAR, patient.birth_date) (static)
   → merge: applied vs expected → {done, pending, late}
[Register dose]  recordVaccinationAction → insert patient_vaccinations row (profile_id scoped)
```

### Consultation timer

```
[Open case]  case RSC sends case.started_at → client <ConsultationTimer startedAt={...}/>
   → ticks now()-startedAt each second; no write on the hot path
```

## Build Order (dependency-driven)

| # | Feature | Depends on | Why this order |
|---|---------|-----------|----------------|
| 1 | Report-print spacing fix + age-in-days display | nothing | Pure dor-de-uso fixes in the PDF kit / formatters; no schema. Ship first (PROJECT.md priority #1). |
| 2 | Consultation timer | reuses `cases.started_at` | No schema (best case). Smallest consult-experience win. |
| 3 | Patient photo | `patients` table + new private bucket | One `ADD COLUMN` + bucket + upload module. Self-contained; high user value. |
| 4 | New document types (referral → exam request → medical report) | document-slice pattern, PDF kit | Each is an independent prescriptions-clone. Build referral first as the template, then copy. Largest block but parallelizable across the 3 types. |
| 5 | Orientation templates + blank prescription | `prescription` wizard (blank = empty payload, no schema); `orientation_templates` table | Blank prescription is near-free (reuse wizard). Orientation templates is one small table + slice. |
| 6 | Vaccines — reference calendar | static data only | No schema. Read-only screen. Can land anytime after #1; independent. |
| 7 | Vaccines — per-patient card | reference calendar (#6) + new table | Needs the static calendar to compute pending/late. Last because it's the most logic-heavy and depends on #6. |

**Critical ordering constraints:**
- #7 depends on #6 (card merges against the reference calendar).
- The three doc types in #4 share one slice template — build referral fully, extract the shape, then exam-request and medical-report are mechanical copies.
- #1, #2, #6 carry **no migration**, so they de-risk the milestone early and can ship independently.

## Anti-Patterns (specific to this codebase)

### Anti-Pattern 1: One generic `documents` table with a `type` discriminator across doc types
**What people do:** Collapse referrals/exam-requests/medical-reports into a single polymorphic table + one mega-wizard.
**Why it's wrong:** Breaks the established house style (`prescriptions` and `medical_certificates` are separate tables despite identical shape), forces a union Zod schema and a branchy PDF generator, and couples three independently-evolving documents.
**Do this instead:** One slice + one table per doc type. Reuse the *pattern*, not the *table*. (Use an internal enum only for sub-variants of a single type, as `medical_certificate_type` does.)

### Anti-Pattern 2: Public bucket / no RLS for patient photos
**What people do:** Reuse the `profile-logos` public-bucket recipe for child photos to get a free `getPublicUrl`.
**Why it's wrong:** Children's photos are sensitive (explicit PROJECT.md privacy constraint); a public URL leaks them to anyone with the link.
**Do this instead:** Private bucket, `{profile_id}/` key, storage RLS via `profiles.auth_user_id = auth.uid()`, signed URLs at render. Copy the `prescriptions` storage RLS, not the `profile-logos` one.

### Anti-Pattern 3: A vaccine-calendar table seeded per profile
**What people do:** Create a `vaccines` table and seed the full SUS/particular schedule for every profile.
**Why it's wrong:** The calendar is global and identical — per-profile rows are pure duplication with no ownership meaning, and updating the schedule becomes a data-migration chore.
**Do this instead:** Static typed constant in `modules/vaccines/`. Only `patient_vaccinations` (real applied events) is a `profile_id`-scoped table.

### Anti-Pattern 4: Persisting the timer tick / adding a new column when `started_at` exists
**What people do:** Write a new `consultation_timer` table or push elapsed seconds to the server on an interval.
**Why it's wrong:** Hot-path writes for a value derivable from one timestamp; ignores the existing `cases.started_at`.
**Do this instead:** Send `started_at`, compute elapsed on the client. Add a column only if start/pause must be decoupled from case creation.

### Anti-Pattern 5: Skipping the auth + paid gate or the RLS migration on new slices
**What people do:** Copy the action body but forget `profile.status === "paid"`, or add a table without RLS in the same migration.
**Why it's wrong:** RLS-enabled-without-policy denies all access; a missing paid gate is a revenue/security hole. The codebase explicitly added RLS migrations (`20260604*`) to close this.
**Do this instead:** Every new action gates on auth + paid. Every new table ships RLS (4 policies, ownership via `profiles.auth_user_id = auth.uid()`) in the same migration as the `create table`.

## Integration Points

### External services (reused, no new integrations)
| Service | Integration pattern | Notes |
|---------|--------------------|-------|
| `@falaped/falaped-kit/pdf` | New `generate-<doc>-pdf.ts` per doc type, same as `generate-prescription-pdf.ts` | Print-spacing fix (Block 1) lives here / in kit; may need a kit bump (≥0.2.7). |
| Supabase Storage | New private buckets via `lib/constants.ts` + storage RLS migration | Copy `storage_prescriptions` RLS verbatim, change bucket id. |
| Supabase Postgres | New tables via migrations, RLS in-file | Mirror `prescriptions` table + `rls_prescriptions`. |
| Groq | **Not used** this milestone (exam photo extraction is out of scope → v2) | Leave assistant pipeline untouched. |

### Internal boundaries
| Boundary | Communication | Notes |
|----------|--------------|-------|
| wizard (client) ↔ action | Server Action call, result union | Never call modules from client. |
| action ↔ module | Direct fn call, injected `SupabaseClient` | Modules never build clients / import `next/cache`/`next/headers`. |
| `vaccinations` ↔ `vaccines` static | `vaccine_key` string join in app code | Card rows reference static calendar by key; no FK. |
| patient photo ↔ `patients` | `photo_storage_path` column | Extension, not a new slice. |
| timer ↔ `cases` | reads `started_at` | Extension, not a new slice. |

## New Supabase Objects — Summary (all owned via `profile_id`)

| Object | Type | Key columns / ownership |
|--------|------|-------------------------|
| `referrals` | table | profile_id, patient_id?, case_id?, payload jsonb, issued_at, pdf_storage_path |
| `exam_requests` | table | (identical shape to `referrals`) |
| `medical_reports` | table | (identical shape to `referrals`) |
| `orientation_templates` | table | profile_id, name, snapshot jsonb (orientation text) |
| `patient_vaccinations` | table | profile_id, patient_id, vaccine_key, dose_label?, applied_at?, status |
| `patients.photo_storage_path` | column | extends existing `patients` |
| `cases.consultation_started_at` | column (CONDITIONAL) | only if start/pause must differ from `started_at` |
| `referrals` / `exam-requests` / `medical-reports` / `patient-photos` | private buckets | objects keyed `{profile_id}/...`, storage RLS via `profiles.auth_user_id` |
| `VACCINE_CALENDAR` | static TS const (no DB) | global SUS + particular + gestante schedule |

## Sources

- `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `INTEGRATIONS.md` (existing intel) — HIGH
- `supabase/migrations/20260315000000_prescriptions.sql`, `20260315010000_storage_prescriptions.sql`, `20260316010000_create_prescription_templates.sql`, `20260604000000_rls_prescriptions.sql`, `20260314000000_medical_certificates.sql`, `20260301000000_patients_add_profile_id.sql` — HIGH
- `actions/prescriptions/generate-prescription.ts`, `modules/prescriptions/upload-prescription-pdf.ts`, `app/api/prescriptions/[id]/download/route.ts`, `modules/profiles/upload-profile-logo.ts`, `modules/cases/get-case-by-id.ts` (CaseDetail has `started_at`/`ended_at`), `modules/patients/types.ts`, `lib/constants.ts` — HIGH

---
*Architecture research for: Falaped brownfield feature integration*
*Researched: 2026-06-28*

# Phase 1: Security Foundation - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 14
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `modules/prescriptions/delete-prescription.ts` | module | CRUD | self (current broken file) | exact |
| `modules/prescriptions/delete-prescriptions-bulk.ts` | module | CRUD/batch | `modules/prescriptions/delete-prescription.ts` | role-match |
| `modules/medical-certificates/delete-medical-certificate.ts` | module | CRUD | self (current broken file) | exact |
| `modules/medical-certificates/delete-medical-certificates-bulk.ts` | module | CRUD/batch | `modules/medical-certificates/delete-medical-certificate.ts` | role-match |
| `actions/prescriptions/delete-prescription.ts` | service/action | request-response | self (current broken file) | exact |
| `actions/prescriptions/delete-prescriptions-bulk.ts` | service/action | request-response/batch | self (current broken file) | exact |
| `actions/medical-certificates/delete-medical-certificate.ts` | service/action | request-response | self (current broken file) | exact |
| `actions/medical-certificates/delete-medical-certificates-bulk.ts` | service/action | request-response/batch | self (current broken file) | exact |
| `supabase/migrations/20260604000000_rls_prescriptions.sql` | migration | CRUD | `supabase/migrations/20260315010000_storage_prescriptions.sql` | role-match |
| `supabase/migrations/20260604000001_rls_medical_certificates.sql` | migration | CRUD | `supabase/migrations/20260314010000_storage_medical_certificates.sql` | role-match |
| `supabase/migrations/20260604000002_rls_patients.sql` | migration | CRUD | `supabase/migrations/20260315010000_storage_prescriptions.sql` | partial |
| `supabase/migrations/20260604000003_rls_cases.sql` | migration | CRUD/event-driven | `supabase/migrations/20260315010000_storage_prescriptions.sql` | partial |
| `supabase/migrations/20260604000004_rls_auxiliary.sql` | migration | CRUD | `supabase/migrations/20260315010000_storage_prescriptions.sql` | partial |
| `.github/workflows/ci.yml` | config | request-response | none in codebase | no analog |
| `modules/prescriptions/delete-prescription.spec.ts` | test | request-response | `modules/patients/patient-sex.spec.ts` | role-match |
| `modules/prescriptions/delete-prescriptions-bulk.spec.ts` | test | request-response | `modules/patients/patient-sex.spec.ts` | role-match |
| `modules/medical-certificates/delete-medical-certificate.spec.ts` | test | request-response | `modules/patients/patient-sex.spec.ts` | role-match |
| `modules/medical-certificates/delete-medical-certificates-bulk.spec.ts` | test | request-response | `modules/patients/patient-sex.spec.ts` | role-match |

---

## Pattern Assignments

### `modules/prescriptions/delete-prescription.ts` (module, CRUD — MODIFIED)

**Analog:** `modules/prescriptions/delete-prescription.ts` (current file — fix in place)

**Current imports pattern** (lines 1-2):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import { PRESCRIPTIONS_BUCKET } from "@/lib/constants"
```
Keep these imports exactly. Remove `storageClient?: SupabaseClient` parameter from the signature. No new imports needed.

**Current broken function signature** (lines 9-14):
```typescript
export async function deletePrescription(
  supabase: SupabaseClient,
  prescriptionId: string,
  pdfStoragePath: string | null,
  storageClient?: SupabaseClient,   // REMOVE — admin client bypass
): Promise<void> {
```

**Fixed function signature:**
```typescript
export async function deletePrescription(
  supabase: SupabaseClient,    // user-scoped client; storage RLS handles bucket access
  prescriptionId: string,
  profileId: string,           // ADD — ownership anchor for IDOR fix
  pdfStoragePath: string | null,
): Promise<void> {
```

**Fixed core pattern (DB-first, ownership-scoped, no admin client):**
```typescript
  // 1. Delete DB row first — scoped by ownership (IDOR fix)
  const { error } = await supabase
    .from("prescriptions")
    .delete()
    .eq("id", prescriptionId)
    .eq("profile_id", profileId)   // ownership filter — SEC-01

  if (error) {
    throw new Error(`[PRESCRIPTIONS] Failed to delete prescription: ${error.message}`)
  }

  // 2. Remove PDF from storage (user client; storage RLS "Prescriptions delete own" applies)
  if (pdfStoragePath?.trim()) {
    const { error: storageError } = await supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      // Log but do NOT throw — DB row is gone; orphan PDF is preferable to IDOR
      console.error(`[PRESCRIPTIONS] Orphan PDF not removed: ${storageError.message}`)
    }
  }
```

**Rationale for DB-first ordering:** DB failure leaves storage intact (no IDOR); storage failure leaves an orphan PDF (recoverable, not a security issue). Current code is storage-first, which is the wrong order.

---

### `modules/prescriptions/delete-prescriptions-bulk.ts` (module, CRUD/batch — NEW)

**Analog:** `modules/prescriptions/delete-prescription.ts` (fixed version above)

**Imports pattern:**
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import { PRESCRIPTIONS_BUCKET } from "@/lib/constants"
```

**Core batch pattern:**
```typescript
export async function deletePrescriptionsBulk(
  supabase: SupabaseClient,
  ids: string[],
  profileId: string,
  pdfStoragePaths: (string | null)[],
): Promise<{ deletedCount: number }> {
  if (ids.length === 0) return { deletedCount: 0 }

  // Single atomic DB delete — ownership-scoped, silently skips unauthorized IDs
  const { error, count } = await supabase
    .from("prescriptions")
    .delete({ count: "exact" })
    .in("id", ids)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[PRESCRIPTIONS] Bulk delete failed: ${error.message}`)
  }

  // Single storage batch remove — runs only after DB is committed
  const paths = pdfStoragePaths.filter((p): p is string => !!p?.trim())
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .remove(paths)

    if (storageError) {
      console.error(`[PRESCRIPTIONS] Orphan PDFs not removed after bulk delete: ${storageError.message}`)
    }
  }

  return { deletedCount: count ?? ids.length }
}
```

**Key:** `.in("id", ids).eq("profile_id", profileId)` silently no-ops for rows belonging to other profiles. SEC-01 acceptance criterion explicitly accepts this no-op behavior.

---

### `modules/medical-certificates/delete-medical-certificate.ts` (module, CRUD — MODIFIED)

**Analog:** `modules/prescriptions/delete-prescription.ts` fixed version above — mirror it exactly.

**Current imports** (lines 1-2):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import { MEDICAL_CERTIFICATES_BUCKET } from "@/lib/constants"
```

**Fixed signature** (mirror prescription pattern, different table/bucket names):
```typescript
export async function deleteMedicalCertificate(
  supabase: SupabaseClient,
  certificateId: string,
  profileId: string,           // ADD — IDOR fix
  pdfStoragePath: string | null,
): Promise<void> {
  // DB-first, .eq("profile_id", profileId), log storage errors instead of throwing
```

Table name: `"medical_certificates"`, id column: `"id"`, bucket constant: `MEDICAL_CERTIFICATES_BUCKET`.

---

### `modules/medical-certificates/delete-medical-certificates-bulk.ts` (module, CRUD/batch — NEW)

**Analog:** `modules/prescriptions/delete-prescriptions-bulk.ts` (new file above — mirror exactly)

Mirror the prescription bulk module, substituting:
- Table: `"medical_certificates"`
- Bucket constant: `MEDICAL_CERTIFICATES_BUCKET`
- Function name: `deleteMedicalCertificatesBulk`
- Log tag: `[MEDICAL_CERTIFICATES]`

---

### `actions/prescriptions/delete-prescription.ts` (action, request-response — MODIFIED)

**Analog:** self — current file at `actions/prescriptions/delete-prescription.ts`

**Current imports** (lines 1-7):
```typescript
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"          // REMOVE
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deletePrescription } from "@/modules/prescriptions/delete-prescription"
```

**Fixed imports** (remove `createAdminClient`):
```typescript
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deletePrescription } from "@/modules/prescriptions/delete-prescription"
```

**Fixed core pattern** (lines 13-41 — thread profileId, remove storageClient):
```typescript
export async function deletePrescriptionAction(
  prescriptionId: string,
  pdfStoragePath: string | null,
): Promise<DeletePrescriptionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }

  if (!prescriptionId || typeof prescriptionId !== "string")
    return { ok: false, error: "ID da receita inválido." }

  try {
    await deletePrescription(supabase, prescriptionId, profile.id, pdfStoragePath)
    //                                                 ^^^^^^^^^^^ thread profileId
    revalidatePath("/dashboard/prescriptions")
    return { ok: true }
  } catch (e) {
    console.error("[PRESCRIPTIONS] delete failed", e)
    return { ok: false, error: "Erro ao excluir receita. Tente novamente." }
  }
}
```

**Auth pattern** (preserved from current file — lines 17-19):
```typescript
const supabase = await createClient()
const { profile } = await getAuthenticatedUser(supabase)
if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
```

---

### `actions/prescriptions/delete-prescriptions-bulk.ts` (action, request-response/batch — MODIFIED)

**Analog:** self — current file at `actions/prescriptions/delete-prescriptions-bulk.ts`

**Fixed imports** (remove `createAdminClient`, add new bulk module):
```typescript
"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { deletePrescriptionsBulk } from "@/modules/prescriptions/delete-prescriptions-bulk"
```

**Preserve from current file** (lines 10-19):
```typescript
const bulkItemSchema = z.object({
  id: z.string().uuid(),
  pdfStoragePath: z.string().nullable(),
})

export type DeletePrescriptionsBulkResult =
  | { ok: true; deletedCount: number }
  | { ok: false; error: string }

const MAX_BULK = 100
```

**Fixed core pattern** (replace the `for` loop and `storageClient` blocks):
```typescript
  try {
    const { deletedCount } = await deletePrescriptionsBulk(
      supabase,
      parsed.data.map((i) => i.id),
      profile.id,
      parsed.data.map((i) => i.pdfStoragePath),
    )
    revalidatePath("/dashboard/prescriptions")
    return { ok: true, deletedCount }
  } catch (e) {
    console.error("[PRESCRIPTIONS] bulk delete failed", e)
    return { ok: false, error: "Erro ao excluir receitas. Tente novamente." }
  }
```

---

### `actions/medical-certificates/delete-medical-certificate.ts` (action, request-response — MODIFIED)

**Analog:** `actions/prescriptions/delete-prescription.ts` (fixed version above)

Mirror the fixed prescription action exactly, substituting:
- Import: `deleteMedicalCertificate` from `@/modules/medical-certificates/delete-medical-certificate`
- Function name: `deleteMedicalCertificateAction`
- Error messages: `"ID do atestado inválido."` (already in current file), `"Erro ao excluir atestado. Tente novamente."`
- `revalidatePath("/dashboard/medical-certificates")`
- Log tag: `[MEDICAL_CERTIFICATES]`

---

### `actions/medical-certificates/delete-medical-certificates-bulk.ts` (action, request-response/batch — MODIFIED)

**Analog:** `actions/prescriptions/delete-prescriptions-bulk.ts` (fixed version above)

Mirror the fixed prescription bulk action exactly, substituting:
- Import: `deleteMedicalCertificatesBulk` from `@/modules/medical-certificates/delete-medical-certificates-bulk`
- Function name: `deleteMedicalCertificatesBulkAction`
- Error messages: `"Selecione ao menos um atestado."`, `"Máximo de ${MAX_BULK} atestados por exclusão."`, `"Erro ao excluir atestados. Tente novamente."`
- `revalidatePath("/dashboard/medical-certificates")`
- Log tag: `[MEDICAL_CERTIFICATES]`

---

### `supabase/migrations/20260604XXXXXX_rls_prescriptions.sql` (migration, CRUD — NEW)

**Analog:** `supabase/migrations/20260315010000_storage_prescriptions.sql`

**Analog excerpt** (lines 8-43 — the exact policy shape to mirror for table RLS):
```sql
create policy "Prescriptions select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
```

**Table RLS migration pattern** (adapting the storage pattern to table policies):
```sql
-- Enable RLS + policies atomically — NEVER enable without policies (instant lockout)
alter table public.prescriptions enable row level security;

create policy "Prescriptions select own"
on public.prescriptions for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions insert own"
on public.prescriptions for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions update own"
on public.prescriptions for update to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions delete own"
on public.prescriptions for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
```

**Mandatory reversal script** (ship alongside every migration, execute via MCP on rollback):
```sql
drop policy if exists "Prescriptions select own" on public.prescriptions;
drop policy if exists "Prescriptions insert own" on public.prescriptions;
drop policy if exists "Prescriptions update own" on public.prescriptions;
drop policy if exists "Prescriptions delete own" on public.prescriptions;
alter table public.prescriptions disable row level security;
```

---

### `supabase/migrations/20260604XXXXXX_rls_medical_certificates.sql` (migration, CRUD — NEW)

**Analog:** `supabase/migrations/20260314010000_storage_medical_certificates.sql`

Mirror the prescriptions RLS migration exactly, substituting:
- Table: `public.medical_certificates`
- Policy names: `"Medical Certificates select own"` etc.

---

### `supabase/migrations/20260604XXXXXX_rls_patients.sql` (migration, CRUD — NEW)

**Analog:** `supabase/migrations/20260315010000_storage_prescriptions.sql` (same subquery anchor pattern)

Mirror the prescriptions RLS migration, substituting `public.patients` and policy names `"Patients select own"` etc. Verify `profile_id` column exists on `patients` table via MCP before writing.

---

### `supabase/migrations/20260604XXXXXX_rls_cases.sql` (migration, CRUD — NEW)

**Analog:** `supabase/migrations/20260315010000_storage_prescriptions.sql` (structure); but uses two-hop `user_phone` join instead of `profile_id`.

**Cases-specific pattern** (two-hop join via `authenticated_users`):
```sql
-- Helper function — security definer with empty search_path (matches existing trigger function convention)
create or replace function public.auth_user_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select au.phone
  from public.authenticated_users au
  join public.profiles p on p.id = au.profile_id
  where p.auth_user_id = auth.uid()
  limit 1
$$;

alter table public.cases enable row level security;

create policy "Cases select own"
on public.cases for select to authenticated
using (user_phone = public.auth_user_phone());

-- (pattern repeats for insert/update/delete)
```

**Reversal includes function drop:**
```sql
drop policy if exists "Cases select own" on public.cases;
-- ... other policies ...
alter table public.cases disable row level security;
drop function if exists public.auth_user_phone();
```

**IMPORTANT:** Confirm via MCP whether `cases.profile_id` is always populated before choosing between `profile_id` direct and the two-hop `user_phone` helper. If `profile_id` is always set, use it directly (simpler, no helper function needed).

---

### `supabase/migrations/20260604XXXXXX_rls_auxiliary.sql` (migration, CRUD — NEW)

**Analog:** `supabase/migrations/20260315010000_storage_prescriptions.sql`

Covers `prescription_templates`, `phone_link_codes`, `report_templates`, `discussions` (or similar auxiliary tables confirmed via MCP). Use the same `profile_id in (select id from public.profiles where auth_user_id = auth.uid())` anchor. Verify ownership column names per table via MCP before writing.

---

### `.github/workflows/ci.yml` (config — NEW)

**Analog:** None in codebase — no `.github/` directory exists.

**Pattern from RESEARCH.md (GitHub Actions standard):**
```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Typecheck
        run: yarn typecheck

      - name: Lint
        run: yarn lint

      - name: Test
        run: yarn test

      - name: Build
        run: yarn build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: placeholder-key-for-ci-build
```

**Node version rationale:** Node 20 matches `@types/node: "^20"` in devDependencies. `cache: "yarn"` uses `actions/setup-node` built-in Yarn cache support.

---

### Test spec files (test, request-response — NEW)

**Analog:** `modules/patients/patient-sex.spec.ts`

**Test framework pattern** (lines 1-8):
```typescript
import test from "node:test"
import assert from "node:assert/strict"

import { functionUnderTest } from "@/modules/domain/function-under-test"
```

**Test structure pattern** (lines 9-35):
```typescript
test("description of behavior being tested", () => {
  assert.equal(actual, expected)
})
```

**For delete module specs — mock pattern:**

The injected `SupabaseClient` pattern makes mocking straightforward. Each spec needs a minimal mock object implementing the Supabase query builder chain:

```typescript
// Mock for .from("prescriptions").delete().eq().eq()
function makeMockSupabase({ dbError = null, storageError = null } = {}) {
  return {
    from: (_table: string) => ({
      delete: (_opts?: object) => ({
        eq: (_col: string, _val: string) => ({
          eq: (_col2: string, _val2: string) => Promise.resolve({ error: dbError, count: dbError ? null : 1 }),
          in: (_col2: string, _vals: string[]) => ({
            eq: (_col3: string, _val3: string) => Promise.resolve({ error: dbError, count: dbError ? null : _vals.length }),
          }),
        }),
        in: (_col: string, _vals: string[]) => ({
          eq: (_col2: string, _val2: string) => Promise.resolve({ error: dbError, count: dbError ? null : _vals.length }),
        }),
      }),
    }),
    storage: {
      from: (_bucket: string) => ({
        remove: (_paths: string[]) => Promise.resolve({ error: storageError }),
      }),
    },
  } as unknown as SupabaseClient
}
```

**SEC-01 test pattern:**
```typescript
test("deletePrescription does not throw when profileId does not match (ownership no-op)", async () => {
  // DB returns count: 0 (no rows matched) — not an error, just a no-op
  const supabase = makeMockSupabase({ dbError: null })
  // Should not throw even if 0 rows deleted
  await assert.doesNotReject(() =>
    deletePrescription(supabase, "some-uuid", "other-profile-id", null)
  )
})

test("deletePrescription deletes own prescription successfully", async () => {
  const supabase = makeMockSupabase()
  await assert.doesNotReject(() =>
    deletePrescription(supabase, "own-uuid", "own-profile-id", null)
  )
})
```

**SEC-04 test pattern (bulk — single call verification):**
```typescript
test("deletePrescriptionsBulk makes exactly one DB call and one storage call", async () => {
  let dbCallCount = 0
  let storageCallCount = 0
  // ... spy mock that increments counters ...
  await deletePrescriptionsBulk(spySupabase, ["id1", "id2"], "profile-id", ["path1", "path2"])
  assert.equal(dbCallCount, 1)
  assert.equal(storageCallCount, 1)
})
```

---

## Shared Patterns

### Auth Gate
**Source:** `actions/prescriptions/delete-prescription.ts` lines 17-19
**Apply to:** All action files (already present, must be preserved in modified files)
```typescript
const supabase = await createClient()
const { profile } = await getAuthenticatedUser(supabase)
if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
```

### Result Union Return Type
**Source:** `actions/prescriptions/delete-prescription.ts` lines 9-11
**Apply to:** All action files
```typescript
export type DeletePrescriptionResult =
  | { ok: true }
  | { ok: false; error: string }
```

### Module Error Throw Convention
**Source:** `modules/prescriptions/delete-prescription.ts` lines 37-39
**Apply to:** All module files
```typescript
throw new Error(`[DOMAIN_TAG] Descriptive failure message: ${error.message}`)
```
Log tag is always `[PRESCRIPTIONS]` or `[MEDICAL_CERTIFICATES]` — uppercase domain name in brackets.

### Storage Orphan Log (No Throw)
**Source:** Research pattern (RESEARCH.md Pattern 1, storage error handling)
**Apply to:** All module delete files after this phase
```typescript
if (storageError) {
  // Log but do NOT throw — DB row is gone; orphan PDF is preferable to IDOR
  console.error(`[DOMAIN] Orphan PDF not removed: ${storageError.message}`)
}
```

### RLS Ownership Anchor
**Source:** `supabase/migrations/20260315010000_storage_prescriptions.sql` lines 8-15
**Apply to:** All RLS migration files (profile_id-based tables)
```sql
profile_id in (
  select id from public.profiles where auth_user_id = auth.uid()
)
```

### RLS Enable + Policies Atomically
**Source:** Research (RESEARCH.md Pitfall 1 / Anti-Pattern note)
**Apply to:** Every RLS migration file
```sql
-- Rule: always enable RLS and create all policies in the same migration file.
-- Enabling RLS without policies immediately denies all authenticated access.
alter table public.X enable row level security;
-- ... all four CRUD policies in the same file ...
```

### Reversal Script Per Migration
**Apply to:** Every RLS migration file — drafted before applying
```sql
-- REVERSAL — drop policies + disable RLS; no DML, data untouched
drop policy if exists "X select own" on public.X;
drop policy if exists "X insert own" on public.X;
drop policy if exists "X update own" on public.X;
drop policy if exists "X delete own" on public.X;
alter table public.X disable row level security;
```

### PT-BR Error Messaging
**Source:** `actions/prescriptions/delete-prescription.ts` / `actions/medical-certificates/delete-medical-certificate.ts`
**Apply to:** All action files — user-facing error strings must be in Portuguese
```typescript
"Sessão não encontrada."
"Erro ao excluir receita. Tente novamente."
"Erro ao excluir atestado. Tente novamente."
"Selecione ao menos uma receita."
"Máximo de 100 receitas por exclusão."
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/workflows/ci.yml` | config | push-triggered | No `.github/` directory exists in the codebase — use GitHub Actions standard pattern from RESEARCH.md |

---

## Metadata

**Analog search scope:** `modules/`, `actions/`, `supabase/migrations/`, `lib/supabase/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-06-04

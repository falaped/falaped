# Phase 02: Foto Privada do Paciente - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 13 (8 new, 5 modified)
**Analogs found:** 13 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/constants.ts` (modify) | config | — | self (`PRESCRIPTIONS_BUCKET` line 8) | exact |
| `supabase/migrations/<ts>_patients_add_photo.sql` (new) | migration | — | `20260628000000_patients_add_gestational_age.sql` | exact |
| `supabase/migrations/<ts>_storage_patient_photos_rls.sql` (new) | migration | — | `20260315010000_storage_prescriptions.sql` | exact |
| `modules/patients/upload-patient-photo.ts` (new) | module | file-I/O | `modules/profiles/upload-profile-logo.ts` | role+flow (adapt: private, no getPublicUrl) |
| `modules/patients/delete-patient-photo.ts` (new) | module | file-I/O | `modules/profiles/delete-profile-logo.ts` | role+flow |
| `modules/patients/update-patient-photo.ts` (new) | module | CRUD | `modules/patients/update-patient.ts` | exact |
| `modules/patients/get-patient-photo-signed-url.ts` (new) | module | file-I/O | `app/api/prescriptions/[id]/download/route.ts` (createSignedUrl block) | flow-match |
| `modules/patients/get-patients-photo-signed-urls.ts` (new) | module | batch / file-I/O | `app/api/prescriptions/[id]/download/route.ts` (adapt to `createSignedUrls`) | flow-match |
| `modules/patients/delete-patient.ts` (modify) | module | CRUD + file-I/O | self + `delete-profile-logo.ts` (add `remove`) | exact |
| `modules/patients/types.ts` (modify) | model | — | self (`Patient` type) | exact |
| `actions/patients/upload-patient-photo.ts` (new) | action | request-response | `actions/profile/upload-profile-logo.ts` | role+flow (adapt: +paid gate, +consent) |
| `lib/schemas/patient.ts` (modify) | config / schema | — | self (`updatePatientSchema`) | exact |
| `components/dashboard/patients/patient-detail-hero.tsx` (modify) | component | request-response | self + `components/ui/avatar.tsx` | exact |
| `components/dashboard/patients/patients-table.tsx` (modify) | component | request-response | self (Avatar block lines 78-86) | exact |
| `components/dashboard/patients/patients-content.tsx` (modify) | component (server) | batch | self (server component that fetches list) | exact |
| `components/dashboard/cases/case-patient-info.tsx` (modify) | component | request-response | self + `patient-detail-hero.tsx` Avatar | exact |
| `components/dashboard/patients/patient-form/` (modify) | component | request-response | `patient-form.tsx` + `checkbox.tsx` | role-match |
| `actions/patients/index.ts` (modify) | config (barrel) | — | self | exact |

> Note: research lists `lib/compress-image.ts` as optional. The compression wrapper (`browser-image-compression`) is a NEW client utility with **no codebase analog** — see "No Analog Found".

## Pattern Assignments

### `modules/patients/upload-patient-photo.ts` (module, file-I/O)

**Analog:** `modules/profiles/upload-profile-logo.ts` — ADAPT, do not copy. The analog is a **public** bucket + `getPublicUrl`; the photo requires a **private** bucket and returns the **path** (not URL). Strip the `getPublicUrl` tail (lines 41-44).

**Validation + upsert pattern** (`upload-profile-logo.ts` lines 6-39 — copy this shape):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]   // NO image/svg+xml (security threat table)
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function uploadPatientPhoto(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  file: File | Blob
): Promise<string> {
  const blob = file instanceof File ? file : new File([file], "photo")
  if (!ALLOWED_TYPES.includes(blob.type))
    throw new Error("[PATIENTS] Tipo de arquivo não permitido. Use PNG, JPEG ou WebP.")
  if (blob.size > MAX_SIZE_BYTES)
    throw new Error("[PATIENTS] Arquivo muito grande. Máximo 2 MB.")

  const ext = blob.name?.match(/\.(png|jpe?g|webp)$/i)?.[1] ?? "jpg"
  const path = `${profileId}/${patientId}.${ext}`   // profile_id prefix = RLS scope (D-03)

  const { error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type })   // upsert = single replaceable photo (D-08)
  if (error)
    throw new Error(`[PATIENTS] Falha no upload da foto: ${error.message}`)

  return path   // ⚠️ return PATH, not getPublicUrl (D-02)
}
```

**Error tag:** `[PATIENTS]` (domain tag in brackets — CONVENTIONS). One exported function per file.

---

### `modules/patients/delete-patient-photo.ts` (module, file-I/O)

**Analog:** `modules/profiles/delete-profile-logo.ts` (lines 11-43). Adapt to a private bucket; idempotent (no throw when path absent). Simpler than the analog — the photo path is known (stored in `patients.photo_path`), so no `list` is required; remove directly.

**Idempotent remove pattern** (research Code Example lines 408-413; backed by `delete-profile-logo.ts` lines 35-42):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

export async function deletePatientPhoto(
  supabase: SupabaseClient,
  photoPath: string | null
): Promise<void> {
  if (!photoPath) return   // idempotent — no-op when nothing stored
  const { error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .remove([photoPath])
  if (error)
    throw new Error(`[PATIENTS] Falha ao remover foto do storage: ${error.message}`)
}
```

---

### `modules/patients/update-patient-photo.ts` (module, CRUD)

**Analog:** `modules/patients/update-patient.ts` (lines 30-89) — the canonical owner-scoped update. KEY: `.eq("id", id).eq("profile_id", profileId)` (lines 78-79) is the IDOR backstop (Pitfall 3 — app has no table RLS by default). Thread `profileId` from the action; never trust `patientId` alone.

**Ownership-scoped update pattern** (`update-patient.ts` lines 75-88):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"

export async function updatePatientPhoto(
  supabase: SupabaseClient,
  patientId: string,
  profileId: string,
  fields: { photo_path: string | null; consent_given: boolean; consent_at: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("patients")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", patientId)
    .eq("profile_id", profileId)   // ⚠️ ownership backstop — Pitfall 3
  if (error)
    throw new Error(`[PATIENTS] Failed to update patient photo: ${error.message}`)
}
```

---

### `modules/patients/get-patient-photo-signed-url.ts` (module, file-I/O)

**Analog:** `app/api/prescriptions/[id]/download/route.ts` lines 5, 42-52 — the exact `createSignedUrl` block. Module form: receive `supabase` + `photoPath`, return `signedUrl | null`. TTL is planner discretion (project default 60s, line 5).

**Signed URL pattern** (`download/route.ts` lines 42-52):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

const SIGNED_URL_EXPIRY_SECONDS = 60   // project default; planner may raise for the list

export async function getPatientPhotoSignedUrl(
  supabase: SupabaseClient,
  photoPath: string | null
): Promise<string | null> {
  if (!photoPath) return null
  const { data, error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_EXPIRY_SECONDS)
  if (error || !data?.signedUrl) return null   // graceful: AvatarFallback covers null
  return data.signedUrl
}
```

> ANTI-PATTERN: never persist the signed URL in the DB (it expires). Store only `photo_path`; sign at render time.

---

### `modules/patients/get-patients-photo-signed-urls.ts` (module, batch file-I/O)

**Analog:** same `createSignedUrl` block, but use the **plural batch API** `createSignedUrls(paths[], TTL)` (research Pattern 3, lines 218-227; storage-js 2.108.2). One round-trip avoids N+1 on the list (Open Question 1). Return a `Map<path, signedUrl>` so the caller maps URLs back per patient.

**Batch pattern** (research lines 218-225):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

export async function getPatientsPhotoSignedUrls(
  supabase: SupabaseClient,
  photoPaths: string[],
  expirySeconds = 60
): Promise<Map<string, string>> {
  if (photoPaths.length === 0) return new Map()
  const { data, error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .createSignedUrls(photoPaths, expirySeconds)
  if (error || !data) return new Map()
  return new Map(
    data.filter((s) => s.signedUrl).map((s) => [s.path as string, s.signedUrl])
  )
}
```

> Resolve in the **server component** `patients-content.tsx` (already runs with the session) and pass resolved URLs down — never sign in the client.

---

### `modules/patients/delete-patient.ts` (modify — module, CRUD + file-I/O)

**Current:** unlinks cases then deletes the row (lines 12-31). **Add a storage-removal step** before the row delete (Pitfall 2 / success criterion 3 — delete must remove object + reference). Read `photo_path` first (or accept it as an arg), then call `deletePatientPhoto`. Use the **user client** (RLS allows owner delete) — do not use service-role.

**Insertion point** — before line 22 (`delete().eq("id", id).eq("profile_id", profileId)`):
```typescript
// 1. fetch photo_path (or take from caller), then:
await deletePatientPhoto(supabase, photoPath)   // idempotent; LGPD: object must not orphan
// 2. existing row delete (keep .eq("id").eq("profile_id"))
```

---

### `modules/patients/types.ts` (modify — model)

**Analog:** self. Add three nullable fields to the `Patient` type (lines 6-26). Also update the `PATIENT_SELECT` constants in `update-patient.ts` (line 6-7), `create-patient.ts` (line 6-7), and `get-patient-by-id.ts` (lines 4-5) to include the new columns. **NOTE (research Open Question 3):** `get-patient-by-id.ts` PATIENT_SELECT is missing `gestational_age_weeks` — fix it while editing.

```typescript
// add to Patient type:
  photo_path: string | null
  consent_given: boolean | null
  consent_at: string | null
```

---

### `actions/patients/upload-patient-photo.ts` (new — action, request-response)

**Analog:** `actions/profile/upload-profile-logo.ts` (lines 1-47) for the upload shape, BUT add the **paid gate** (from `actions/patients/update-patient.ts` lines 24-25) and **consent validation** (D-04/Pitfall 4). The logo action lacks the paid gate — the new action MUST include it.

**Auth + paid gate + consent pattern** (compose `upload-profile-logo.ts` lines 19-35 + `update-patient.ts` lines 21-25):
```typescript
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { uploadPatientPhoto } from "@/modules/patients/upload-patient-photo"
import { updatePatientPhoto } from "@/modules/patients/update-patient-photo"

export type UploadPatientPhotoResult =
  | { ok: true }
  | { ok: false; error: string }

export async function uploadPatientPhotoAction(
  formData: FormData,
): Promise<UploadPatientPhotoResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

  // Zod safeParse: patientId, consent (z.literal(true) or refine), file
  // ⚠️ consent === true validated HERE, not just in the form (Pitfall 4)
  // if (parsed.data.consent !== true) return { ok: false, error: "Consentimento obrigatório." }

  try {
    const path = await uploadPatientPhoto(supabase, profile.id, patientId, file)
    await updatePatientPhoto(supabase, patientId, profile.id, {
      photo_path: path,
      consent_given: true,
      consent_at: new Date().toISOString(),   // re-written on every upload incl. replace (D-06)
    })
    revalidatePath(`/dashboard/patients/${patientId}`)
    revalidatePath("/dashboard/patients")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao enviar foto." }
  }
}
```

Add to `actions/patients/index.ts` (line 4): `export { uploadPatientPhotoAction } from "./upload-patient-photo"`. Also export from root `actions/index.ts`.

---

### `supabase/migrations/<ts>_storage_patient_photos_rls.sql` (new — migration)

**Analog:** `supabase/migrations/20260315010000_storage_prescriptions.sql` (lines 1-43) — the EXACT mold. Copy verbatim, swap bucket name `prescriptions` → `patient-photos`. 4 policies (select/insert/update/delete), `public=false`.

```sql
-- Source: 20260315010000_storage_prescriptions.sql (rename bucket only)
insert into storage.buckets (id, name, public)
values ('patient-photos', 'patient-photos', false)
on conflict (id) do update set public = false;

create policy "Patient photos select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'patient-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
-- repeat for insert (with check), update (using), delete (using)
```

> `(storage.foldername(name))[1]` = first path segment = `profile_id` — this is what makes the `curl` test fail (success criterion 2).

---

### `supabase/migrations/<ts>_patients_add_photo.sql` (new — migration)

**Analog:** `supabase/migrations/20260628000000_patients_add_gestational_age.sql` (lines 1-5). `alter table ... add column if not exists`, with PT-BR `comment on column`. Additive only.

```sql
alter table public.patients
  add column if not exists photo_path text,
  add column if not exists consent_given boolean,
  add column if not exists consent_at timestamptz;

comment on column public.patients.photo_path is
  'Caminho do objeto no bucket privado patient-photos (profile_id/patient_id.ext). NULL quando sem foto. Nunca URL (D-02).';
```

---

### `components/dashboard/patients/patient-detail-hero.tsx` (modify — component)

**Analog:** self (Avatar block lines 68-75) + `components/ui/avatar.tsx`. Add `<AvatarImage>` before the existing `<AvatarFallback>`; pass `photoUrl` by prop (resolved server-side). Fallback (initials, line 47) auto-covers no-photo/expired.

**Pattern** (research Code Example lines 370-373; current avatar lines 68-75):
```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"   // add AvatarImage

<Avatar className="h-20 w-20 shrink-0 ... sm:h-24 sm:w-24">
  {photoUrl ? <AvatarImage src={photoUrl} alt={`Foto de ${patient.name}`} /> : null}
  <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary sm:text-2xl">
    {initials}
  </AvatarFallback>
</Avatar>
```

> Remove `aria-hidden` (line 70) once the avatar carries a real photo — it becomes meaningful content. Use `<AvatarImage>` (Radix `<img>`), NOT `next/image` (Pitfall 5).

---

### `components/dashboard/patients/patients-table.tsx` (modify — component)

**Analog:** self (Avatar block lines 78-86). Same `<AvatarImage>` insertion. The `Patient` rows must carry a resolved `signedUrl` (or a `Map` passed alongside). Uses `size="sm"` avatar.

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

<Avatar size="sm" className="ring-1 ring-border/80 ...">
  {patient.photoUrl ? <AvatarImage src={patient.photoUrl} alt="" /> : null}
  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
    {getPatientInitials(patient.name)}
  </AvatarFallback>
</Avatar>
```

---

### `components/dashboard/patients/patients-content.tsx` (modify — server component, batch)

**Analog:** self (lines 7-15) — the server component that already fetches the list with the session. After `getPatientsByProfileId` (line 13), batch-sign all `photo_path`s via `getPatientsPhotoSignedUrls`, build the `Map`, and thread `signedUrl` into each patient before passing down (resolves Open Question 1, avoids N+1).

```tsx
const patients = await getPatientsByProfileId(supabase, profile.id)
const paths = patients.map((p) => p.photo_path).filter((p): p is string => !!p)
const urlByPath = await getPatientsPhotoSignedUrls(supabase, paths)
const withPhotos = patients.map((p) => ({
  ...p,
  photoUrl: p.photo_path ? (urlByPath.get(p.photo_path) ?? null) : null,
}))
```

---

### `components/dashboard/cases/case-patient-info.tsx` (modify — component)

**Analog:** `patient-detail-hero.tsx` avatar pattern. This component currently has NO avatar (header uses `CardTitle` with `patient.name`, lines 27). Add an `<Avatar>` next to the title in `CardHeader` (lines 26-29), same `<AvatarImage>` + `<AvatarFallback>` shape. `CasePatientDetail` type (`modules/cases/get-case-by-id`) needs `photo_path` + a resolved `photoUrl`.

---

### `components/dashboard/patients/patient-form/` (modify — component)

**Analog:** `patient-form.tsx` (structure, lines 45-121) + `react-hook-form` + `@hookform/resolvers/zod` + `components/ui/checkbox.tsx` (consent checkbox) + `sonner` toast (lines 11, 76-79). Add a file input (classic, NO `capture` attr — D-07) + a blocking consent checkbox (D-04). On submit: compress client-side (`browser-image-compression`), build `FormData(file, patientId, consent)`, call `uploadPatientPhotoAction`.

Field section structure mirrors `PatientFormPersonalSection`/`PatientFormClinicalSection` (lines 84-85). Checkbox text (D-04): `"Confirmo o consentimento do responsável para armazenar esta foto"`. Checkbox must reset/re-require on every upload incl. replace (D-06).

---

### `lib/schemas/patient.ts` (modify — schema)

**Analog:** self (`updatePatientSchema` lines 114-158). Add a dedicated upload schema (do not bloat the patient form schemas). Use `z.literal(true)` (or `.refine`) for consent so the action rejects unconsented uploads server-side (Pitfall 4).

```typescript
export const uploadPatientPhotoSchema = z.object({
  patientId: z.string().uuid(),
  consent: z.literal(true, { message: "Consentimento obrigatório." }),
  // file validated in the module (type/size); FormData File handling in the action
})
```

---

## Shared Patterns

### Authentication + Paid Gate
**Source:** `actions/patients/update-patient.ts` lines 20-25
**Apply to:** the new `actions/patients/upload-patient-photo.ts` (and any photo-delete action)
```typescript
const { profile } = await getAuthenticatedUser(supabase)
if (!profile) return { ok: false, error: "Sessão não encontrada." }
if (profile.status !== "paid")
  return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
```
> ⚠️ `actions/profile/upload-profile-logo.ts` does NOT include the paid gate — the new action MUST add it.

### Ownership Scoping (IDOR backstop)
**Source:** `modules/patients/update-patient.ts` lines 78-79; `get-patient-by-id.ts` lines 20-21; `delete-patient.ts` lines 25-26
**Apply to:** every new patients module touching the row (`update-patient-photo`, `delete-patient`)
```typescript
.eq("id", patientId).eq("profile_id", profileId)
```
> App has NO table RLS by default (CONCERNS / Pitfall 3). Storage RLS protects the object; the `.eq("profile_id")` filter protects the column. Both required (defense-in-depth).

### Private Storage RLS (path-prefix = owner)
**Source:** `supabase/migrations/20260315010000_storage_prescriptions.sql` lines 4-42
**Apply to:** the new `<ts>_storage_patient_photos_rls.sql`
- `public=false` bucket + 4 policies; `(storage.foldername(name))[1] in (select id::text from public.profiles where auth_user_id = auth.uid())`.

### Error Handling (module throws / action catches)
**Source:** modules throw `Error("[PATIENTS] ...")` (e.g. `update-patient.ts` lines 83-86); actions catch → result union (`update-patient.ts` lines 68-72)
**Apply to:** all new modules (throw with `[PATIENTS]` tag) and the new action (catch → `{ ok: false, error }`)

### Result Union at Action Boundary
**Source:** `actions/patients/update-patient.ts` lines 9-11
**Apply to:** the new upload action
```typescript
export type UploadPatientPhotoResult = { ok: true } | { ok: false; error: string }
```

### revalidatePath after mutation
**Source:** `actions/patients/update-patient.ts` lines 65-66
**Apply to:** the new upload action
```typescript
revalidatePath("/dashboard/patients")
revalidatePath(`/dashboard/patients/${patientId}`)
```

### Bucket Constant
**Source:** `lib/constants.ts` line 8 (`PRESCRIPTIONS_BUCKET = "prescriptions"`)
**Apply to:** add `export const PATIENT_PHOTOS_BUCKET = "patient-photos"` with a path-pattern doc comment.

### Avatar with Fallback
**Source:** `components/ui/avatar.tsx` (Avatar/AvatarImage/AvatarFallback exports, lines 105-112); `patient-detail-hero.tsx` lines 68-75
**Apply to:** all three display surfaces. Radix `<img>` auto-falls-back to initials on missing/expired src — no manual `onError` (Don't Hand-Roll). NEVER `next/image` (Pitfall 5).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/compress-image.ts` (optional) | utility | transform | Client-side image compression via `browser-image-compression` is NEW; no existing image-processing utility in the repo. Planner: gate `yarn add browser-image-compression` behind a `checkpoint:human-verify` (slopcheck unavailable — research Package Audit). Params (`maxSizeMB ~1.5`, `maxWidthOrHeight ~1024`, `useWebWorker`) are planner discretion. Reference: research Pattern 4 (lines 233-244). |

## Metadata

**Analog search scope:** `modules/profiles/`, `modules/patients/`, `actions/profile/`, `actions/patients/`, `app/api/prescriptions/`, `supabase/migrations/`, `components/dashboard/patients/`, `components/dashboard/cases/`, `components/ui/`, `lib/`
**Files scanned:** ~22 (18 read in full)
**Pattern extraction date:** 2026-06-28

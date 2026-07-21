# Phase 4: Documentos Clínicos Novos - Pattern Map

**Mapped:** 2026-07-10
**Files analyzed:** ~55 new/modified files across 4 new document domains (referrals / exam-requests / medical-reports / guidance) + 3 template domains + DOC-05 blank-mode edit + exam catalog/panels + seed content
**Analogs found:** 53 / 55 (2 have no direct analog — the searchable exam catalog data model and the milestone-keyed guidance table; both partial-match)

> This is a **clone-the-prescriptions-pattern** phase. The prescriptions + prescription-templates + medical-certificates stacks are the authoritative molds. Every new document domain is a near-verbatim copy with the domain slug and PDF title swapped. RESEARCH's key insight applies: the risk is *divergence*, not novelty — copy the analog faithfully, do not "improve" it.

---

## File Classification

### DOC-01 Encaminhamento (`referrals`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `modules/referrals/insert-referral.ts` | model | CRUD | `modules/prescriptions/insert-prescription.ts` | exact |
| `modules/referrals/get-referrals-by-profile-id.ts` | model | CRUD | `modules/prescriptions/get-prescriptions-by-profile-id.ts` | exact |
| `modules/referrals/get-referrals-by-patient-id.ts` | model | CRUD | `modules/prescriptions/get-prescriptions-by-patient-id.ts` | exact |
| `modules/referrals/get-referrals-by-case-id.ts` | model | CRUD | `modules/prescriptions/get-prescriptions-by-case-id.ts` | exact |
| `modules/referrals/delete-referral.ts` | model | CRUD | `modules/prescriptions/delete-prescription.ts` | exact |
| `modules/referrals/delete-referrals-bulk.ts` | model | CRUD | `modules/prescriptions/delete-prescriptions-bulk.ts` | exact |
| `modules/referrals/generate-referral-pdf.ts` | service | transform/file-I/O | `modules/medical-certificates/generate-medical-certificate-pdf.ts` | exact |
| `modules/referrals/upload-referral-pdf.ts` | service | file-I/O | `modules/prescriptions/upload-prescription-pdf.ts` | exact |
| `modules/referrals/update-referral-pdf-path.ts` | model | CRUD | `modules/prescriptions/update-prescription-pdf-path.ts` | exact |
| `modules/referrals/get-referral-body-segments.ts` | utility | transform | `modules/medical-certificates/get-medical-certificate-body-segments.ts` | exact |
| `modules/referrals/types.ts` | model | — | `modules/prescriptions/types.ts` | exact |
| `actions/referrals/generate-referral.ts` | controller | request-response | `actions/prescriptions/generate-prescription.ts` | exact |
| `actions/referrals/delete-referral.ts` | controller | request-response | `actions/prescriptions/delete-prescription.ts` | exact |
| `actions/referrals/delete-referrals-bulk.ts` | controller | request-response | `actions/prescriptions/delete-prescriptions-bulk.ts` | exact |
| `actions/referrals/index.ts` | config | — | `actions/prescriptions/index.ts` | exact |
| `lib/schemas/referral.ts` | model | — | `lib/schemas/prescription.ts` | exact |
| `app/dashboard/referrals/page.tsx` | route | request-response | `app/dashboard/prescriptions/page.tsx` | exact |
| `app/dashboard/referrals/loading.tsx` | route | — | `app/dashboard/prescriptions/loading.tsx` | exact |
| `app/dashboard/referrals/new/page.tsx` | route | request-response | `app/dashboard/prescriptions/new/page.tsx` | exact |
| `app/api/referrals/[id]/download/route.ts` | route | file-I/O | `app/api/prescriptions/[id]/download/route.ts` | exact |
| `components/dashboard/referrals/referral-wizard.tsx` | component | request-response | `components/dashboard/prescriptions/prescription-wizard.tsx` | role-match |
| `components/dashboard/referrals/referral-card.tsx` | component | — | `components/dashboard/prescriptions/prescription-card.tsx` | exact |
| `components/dashboard/referrals/referral-table.tsx` | component | CRUD | `components/dashboard/prescriptions/prescription-table.tsx` | exact |
| `supabase/migrations/<ts>_referrals.sql` | migration | — | `supabase/migrations/20260315000000_prescriptions.sql` | exact |
| `supabase/migrations/<ts>_rls_referrals.sql` | migration | — | `supabase/migrations/20260604000000_rls_prescriptions.sql` | exact |
| `supabase/migrations/<ts>_storage_referrals.sql` | migration | — | `supabase/migrations/20260315010000_storage_prescriptions.sql` | exact |

### DOC-02 Pedido de exames (`exam_requests`)
Same file set as DOC-01 (module CRUD/pdf/upload triple, action barrel, schema, route page + new + download, wizard/card/table, migration triple), PLUS:

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `modules/exam-catalog/get-exam-catalog-items.ts` | model | CRUD | `modules/prescription-templates/get-prescription-templates-by-profile-id.ts` | role-match |
| `modules/exam-panels/*` (get/create/delete panel) | model | CRUD | `modules/prescription-templates/*` | role-match |
| `components/dashboard/exam-requests/exam-catalog-search.tsx` | component | transform | `components/dashboard/report-templates/report-template-search-input.tsx` | partial (filter/normalize) |
| `supabase/migrations/<ts>_exam_catalog_items.sql` | migration | — | `supabase/migrations/20260316010000_create_prescription_templates.sql` | partial (relational, no payload) |
| `supabase/migrations/<ts>_exam_panels.sql` | migration | — | `supabase/migrations/20260316010000_create_prescription_templates.sql` | role-match |
| exam catalog / default panels SEED content | data | — | **NO CODE ANALOG — human-verify** | none |

### DOC-03 Relatório médico (`medical_reports`)
Same file set as DOC-01, with the wizard reusing `RichTextEditor` for a single free body (NOT sections). PDF via `htmlToPlainTextForPdf` → `buildMedicalCertificatePdf`.

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `modules/medical-reports/generate-medical-report-pdf.ts` | service | transform/file-I/O | `modules/prescriptions/generate-prescription-pdf.ts` (htmlToPlainTextForPdf) + `modules/medical-certificates/generate-medical-certificate-pdf.ts` (title+body shape) | exact |
| `components/dashboard/medical-reports/medical-report-wizard.tsx` | component | request-response | `components/dashboard/prescriptions/prescription-wizard.tsx` + `components/ui/rich-text-editor.tsx` | role-match |
| (all other files) | — | — | mirror DOC-01 table | exact |

### DOC-04 Templates (per doc type: referral / exam-request / medical-report)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `modules/<doc>-templates/create-<doc>-template.ts` | model | CRUD | `modules/prescription-templates/create-prescription-template.ts` | exact |
| `modules/<doc>-templates/get-<doc>-templates-by-profile-id.ts` | model | CRUD | `modules/prescription-templates/get-prescription-templates-by-profile-id.ts` | exact |
| `modules/<doc>-templates/get-<doc>-template-by-id-for-profile.ts` | model | CRUD | `modules/prescription-templates/get-prescription-template-by-id-for-profile.ts` | exact |
| `modules/<doc>-templates/update-<doc>-template.ts` | model | CRUD | `modules/prescription-templates/update-prescription-template.ts` | exact |
| `modules/<doc>-templates/delete-<doc>-template.ts` | model | CRUD | `modules/prescription-templates/delete-prescription-template.ts` | exact |
| `modules/<doc>-templates/types.ts` | model | — | `modules/prescription-templates/types.ts` | exact |
| `actions/<doc>-templates/*` | controller | request-response | `actions/prescription-templates/*` (barrel in `actions/index.ts` line 75) | exact |
| `supabase/migrations/<ts>_create_<doc>_templates.sql` | migration | — | `supabase/migrations/20260316010000_create_prescription_templates.sql` | exact |

### DOC-05 Receituário em branco (blank mode — MODIFY, not new)

| Modified File | Role | Data Flow | Analog / Change | Match Quality |
|---------------|------|-----------|-----------------|---------------|
| `app/dashboard/prescriptions/new/page.tsx` | route | request-response | add `?mode=blank` searchParam passthrough | in-place edit |
| `components/dashboard/prescriptions/prescription-wizard.tsx` | component | request-response | add `blankMode` prop → skip min-1-medication guard, empty body, CTA label `Gerar receituário`, toast `Receituário gerado.` | in-place edit |

### DOC-06 Orientações (`guidance_templates`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `modules/guidance/get-guidance-templates-by-profile-id.ts` | model | CRUD | `modules/prescription-templates/get-prescription-templates-by-profile-id.ts` | role-match |
| `modules/guidance/create/update/delete-guidance-template.ts` | model | CRUD | `modules/prescription-templates/{create,update,delete}-prescription-template.ts` | role-match |
| `modules/guidance/generate-guidance-pdf.ts` | service | transform/file-I/O | `modules/medical-certificates/generate-medical-certificate-pdf.ts` | exact |
| `actions/guidance/*` | controller | request-response | `actions/prescriptions/*` + `actions/prescription-templates/*` | exact |
| `app/dashboard/guidance/page.tsx` (+ new) | route | request-response | `app/dashboard/prescriptions/page.tsx` (+ new) | role-match |
| `components/dashboard/guidance/guidance-*` | component | request-response | `prescription-wizard.tsx` + `MedicalCertificatePatientPickerSheet` | role-match |
| `supabase/migrations/<ts>_guidance_templates.sql` | migration | — | `supabase/migrations/20260316010000_create_prescription_templates.sql` | role-match |
| guidance milestone SEED texts | data | — | **NO CODE ANALOG — human-verify** | none |

---

## Pattern Assignments

### Module: insert-`<doc>`.ts (model, CRUD)

**Analog:** `modules/prescriptions/insert-prescription.ts`

**Full pattern** (lines 1-48) — one exported function, injected `SupabaseClient`, `[DOMAIN]` throw, returns id:
```typescript
import type { SupabaseClient } from "@supabase/supabase-js"

export type InsertReferralParams = {
  profileId: string
  patientId: string | null
  caseId: string | null
  payload: Record<string, unknown>
  locationState: string
  issuedAt: string
}

export async function insertReferral(
  supabase: SupabaseClient,
  params: InsertReferralParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("referrals")
    .insert({
      profile_id: params.profileId,
      patient_id: params.patientId,
      case_id: params.caseId,
      payload: params.payload,
      location_state: params.locationState,
      issued_at: params.issuedAt,
      pdf_storage_path: null,
    })
    .select("id")
    .single()
  if (error) throw new Error(`[REFERRALS] insert failed: ${error.message}`)
  if (!data?.id) throw new Error("[REFERRALS] insert returned no id")
  return data.id as string
}
```
> Note: prescriptions has extra dedicated columns (`orientations`/`warning_signs`/`additional_notes`) hoisted out of the JSONB — new docs following Discretion-A keep everything in `payload` and do NOT add those columns.

---

### Module: get-`<doc>`-by-{profile,patient,case}-id.ts (model, CRUD)

**Analog:** `modules/prescriptions/get-prescriptions-by-profile-id.ts` (lines 1-48) and `get-prescriptions-by-patient-id.ts`

**Core query** — always `.eq("profile_id", …)`, `patient_id`/`case_id` added for scoped variants, order by `issued_at` desc, `patient_name` derived from `payload.patientName`:
```typescript
const { data, error } = await supabase
  .from("referrals")
  .select("id, profile_id, patient_id, payload, location_state, issued_at, pdf_storage_path, created_at")
  .eq("profile_id", profileId)
  .order("issued_at", { ascending: false })
if (error) throw new Error(`[REFERRALS] Failed to fetch list: ${error.message}`)
// map → { …, patient_name: (row.payload?.patientName as string) ?? null }
```
The patient-scoped variant adds `.eq("patient_id", patientId)` (see `get-prescriptions-by-patient-id.ts` line 19); the case-scoped variant adds `.eq("case_id", caseId)`.

---

### Module: delete-`<doc>`.ts (model, CRUD) — IDOR-CRITICAL

**Analog:** `modules/prescriptions/delete-prescription.ts` (current post-fix version — lines 9-41). **Do NOT clone any pre-fix id-only version.**

```typescript
export async function deleteReferral(
  supabase: SupabaseClient,       // user-scoped client; storage RLS handles bucket access
  referralId: string,
  profileId: string,              // ownership anchor for IDOR fix (SEC-01)
  pdfStoragePath: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("referrals")
    .delete()
    .eq("id", referralId)
    .eq("profile_id", profileId)  // ownership filter — NEVER id-only
  if (error) throw new Error(`[REFERRALS] Failed to delete referral: ${error.message}`)

  if (pdfStoragePath?.trim()) {
    const { error: storageError } = await supabase.storage
      .from(REFERRALS_BUCKET)
      .remove([pdfStoragePath])
    if (storageError) console.error(`[REFERRALS] Orphan PDF not removed: ${storageError.message}`)
    // log, do NOT throw — DB row is gone; orphan is preferable to IDOR
  }
}
```

**Ownership test** (clone `modules/prescriptions/delete-prescription.spec.ts` lines 32-54): assert delete does NOT reject when profileId mismatches (0-row no-op), and storage error is swallowed. `node:test` + `tsx`, mock builder returns `.eq().eq()` chain. Add one `*.spec.ts` per new delete module — CONCERNS flags this as the gap that would have caught the original IDOR bug.

---

### Module: generate-`<doc>`-pdf.ts (service, transform → PDF Buffer)

**Analog for DOC-01/02/06 (structured fields → single body):** `modules/medical-certificates/generate-medical-certificate-pdf.ts` (lines 42-70).

**Kit input shape** — verified against `node_modules/@falaped/falaped-kit/dist/**/*.d.ts` `MedicalCertificatePdfInput` (`certificateTitle?`, `patientName`, `date`, `body` (required string), `daysOff?`, `cid?`, `doctorName`, `consultationLocation?`, `logoFooter?: string | Buffer`):
```typescript
import { buildMedicalCertificatePdf } from "@falaped/falaped-kit/pdf"

const input: Parameters<typeof buildMedicalCertificatePdf>[0] = {
  certificateTitle: "ENCAMINHAMENTO",   // "PEDIDO DE EXAMES" / "ORIENTAÇÕES"
  patientName,
  date: issuedAt,
  body,                                  // composed multi-paragraph PT-BR string
  doctorName,
  doctorCrm,
  consultationDateFormatted: issuedAt,
  consultationLocation: locationDisplay?.trim() || undefined,
  logoFooter: logoBuffer ?? undefined,
}
if (doctorRqe) input.doctorRqe = doctorRqe
return buildMedicalCertificatePdf(input)
```

**Body composition** — clone the `bodySegmentsToText` + `getMedicalCertificateBodySegments` pattern (`generate-medical-certificate-pdf.ts` lines 28-37 + `get-medical-certificate-body-segments.ts`). Build `BodySegment[][]` per field, join with `\n\n`. DOC-01 fields: especialidade / motivo / resumo clínico / urgência. DOC-02: item list + hipótese + observações.

**Analog for DOC-03 (TipTap rich-text → PDF):** `modules/prescriptions/generate-prescription-pdf.ts` lines 7-10, 36-38 — use `htmlToPlainTextForPdf` on the TipTap HTML, then feed the plain text as `body` to `buildMedicalCertificatePdf({ certificateTitle: payload.title, body: bodyText, … })`.

> **Anti-pattern (Pitfall 2 + 4):** Do NOT import `pdfkit` directly and do NOT use `buildReportPdf` (multi-section) — it contradicts D-10's single free body and re-loses the Phase-1 print fix.

---

### Module: upload-`<doc>`-pdf.ts + update-`<doc>`-pdf-path.ts

**Analogs:** `modules/prescriptions/upload-prescription-pdf.ts` (lines 10-32) and `update-prescription-pdf-path.ts` (lines 6-21).

Path convention `${profileId}/${docId}.pdf`, `upsert: true`, `contentType: "application/pdf"`, bucket constant from `@/lib/constants` (add `REFERRALS_BUCKET = "referrals"` etc. alongside existing `PRESCRIPTIONS_BUCKET` at `lib/constants.ts:8`):
```typescript
const path = `${profileId}/${docId}.pdf`
const { error } = await supabase.storage.from(REFERRALS_BUCKET)
  .upload(path, buffer, { contentType: "application/pdf", upsert: true })
if (error) throw new Error(`[REFERRALS] Falha no upload do PDF: ${error.message}`)
return path
```

---

### Action: generate-`<doc>`.ts (controller, request-response)

**Analogs:** `actions/prescriptions/generate-prescription.ts` (structure) + `actions/patient-growth/create-measurement.ts` (paid-gate line — D-15).

**Mandatory preamble** (paid gate is the second line — from `create-measurement.ts` lines 34-39; `generate-prescription.ts` currently only checks `profile?.id`, so borrow the paid line from create-measurement):
```typescript
"use server"
const supabase = await createClient()
const { profile } = await getAuthenticatedUser(supabase)
if (!profile) return { ok: false, error: "Sessão não encontrada." }
if (profile.status !== "paid")
  return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }

const parsed = generateReferralSchema.safeParse({ payload: params.payload, locationState: params.locationState, issuedAt: params.issuedAt })
if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
```

**Result union type + orchestration** (from `generate-prescription.ts` lines 18-19, 87-135) — resolve doctor/logo/location/issuedAt, then buildPdf → insert → uploadPdf → updatePdfPath in a try/catch that returns `{ ok:false, error: "Erro ao gerar …" }` on throw:
```typescript
export type GenerateReferralResult =
  | { ok: true; pdfBase64: string; filename: string }
  | { ok: false; error: string }
// … buildPdf → insertReferral → uploadReferralPdf → updateReferralPdfPath
const pdfBase64 = buffer.toString("base64")
const filename = `encaminhamento-${format(new Date(), "yyyy-MM-dd")}.pdf`
return { ok: true, pdfBase64, filename }
```
Doctor/logo/location resolution (logo fetch, `getProfileDefaultLocation`, `issuedAt > today` clamp) is verbatim from `generate-prescription.ts` lines 56-85. Reuse `formatIssuedAt` helper (lines 22-31).

---

### Action: delete-`<doc>`.ts + delete-`<doc>`-bulk.ts (controller)

**Analogs:** `actions/prescriptions/delete-prescription.ts` (lines 1-35) and `delete-prescriptions-bulk.ts` (lines 1-58).

Threads `profile.id` into the module (IDOR anchor), calls `revalidatePath("/dashboard/referrals")`, returns `{ ok: true }` / `{ ok: true; deletedCount }`. Bulk uses a `z.array(bulkItemSchema).safeParse`, `MAX_BULK = 100`, single batched DB delete + single storage remove.

---

### Action barrels: `actions/<doc>/index.ts` + root `actions/index.ts`

**Analog:** `actions/prescriptions/index.ts` (lines 1-12) — re-export each action + its Result type. Then add a block to root `actions/index.ts` (mirroring the existing prescriptions block at line 69 / medical-certificates at 61 / prescription-templates at 75).

---

### Schema: `lib/schemas/<doc>.ts` (model, validation)

**Analog:** `lib/schemas/prescription.ts` (payload + generate wrapper) and `lib/schemas/medical-certificate.ts` (enum + discriminated shapes).

```typescript
import { z } from "zod"
export const referralPayloadSchema = z.object({
  patientName: z.string().optional(),
  birthDate: z.string().optional(),
  specialty: z.string().min(1, "Informe a especialidade ou serviço de destino"),
  reason: z.string().min(1, "Informe o motivo"),
  clinicalSummary: z.string().optional(),
  urgency: z.enum(["rotina", "prioritario", "urgente"]).default("rotina"),  // D-08
})
export const generateReferralSchema = z.object({
  payload: referralPayloadSchema,
  locationState: z.string().optional(),
  issuedAt: z.string().optional(),
})
```
DOC-02: `payload.exams: z.array(z.string().min(1)).min(1, "Adicione pelo menos um exame ao pedido.")` + `hypothesis`/`observations` optional (store RESOLVED strings, not catalog ids — Pitfall 5). DOC-03: `payload.title: z.string().min(1)` + `bodyHtml: z.string()`. Urgency enum default `"rotina"` matches medical-certificate's enum-with-default idiom (`medical-certificate.ts` lines 9-12).

---

### Route page: `app/dashboard/<doc>/page.tsx` (route, list)

**Analog:** `app/dashboard/prescriptions/page.tsx` (lines 1-70). Server component: `createClient` → `getAuthenticatedUser` → `redirect("/auth/login")` on no profile → `getReferralsByProfileId` → header block (`flex flex-col gap-6`, `text-2xl font-semibold tracking-tight`) → empty-state dashed Card OR `<ReferralTable>`. Copy the exact header/empty-state structure; swap icon, title, and PT-BR copy from the UI-SPEC copy tables.

### Route page: `app/dashboard/<doc>/new/page.tsx`

**Analog:** `app/dashboard/prescriptions/new/page.tsx` (lines 1-83). Awaits `searchParams` for `templateId`/`patientId`/`caseId` (D-13 entry points), `Promise.all` loads patients + templates + optional initialTemplate, renders the wizard wrapper. For DOC-05 add `mode?: "blank"` to the searchParams and thread it into the wizard.

### Route: `app/api/<doc>/[id]/download/route.ts`

**Analog:** `app/api/prescriptions/[id]/download/route.ts` (lines 1-55). Owner-scoped fetch (`.eq("id", id).eq("profile_id", profile.id)`), 60s signed URL, `Response.redirect(signed.signedUrl, 302)`. Note it uses Web `Response` (not `NextResponse`) deliberately.

---

### Component: `<doc>`-wizard.tsx (component, request-response)

**Analog:** `components/dashboard/prescriptions/prescription-wizard.tsx` (841 lines — client component, plain `useState` state machine).

**Key seams to clone (line refs):**
- State machine (lines 113-132): `step`, `dataSource: "patient" | "manual" | "template"`, `selectedPatient`, `pickerOpen`, `manualConfirmed`, per-field state, `generating`, `saveAsTemplateOpen`, `templateName`, `templatePickerOpen`.
- Patient picker reuse (line 33 import): `MedicalCertificatePatientPickerSheet` — **do not build a new picker** (UI-SPEC D-13, Don't-Hand-Roll).
- `buildPayload()` (lines 252-269) → trims fields, drops empties.
- `buildTemplateSnapshot()` (lines 271-289) + `handleSaveAsTemplate()` (lines 291-313): validates, calls `create<Doc>TemplateAction`, `toast.success("Template salvo.")`, `router.refresh()`.
- `handleGenerate()` (lines 315-347): pre-submit guard toast → call action → base64→Blob→download→`router.push` list→`router.refresh()`; error via `toast.error(getFriendlyToastMessage(result.error))`.
- "Salvar como template" Dialog (lines 622-663) + "Usar template" Sheet (lines 702-729).

**DOC-01 field deltas** (UI-SPEC surface contract): specialty = `components/ui/combobox.tsx` (exists) seeded with pediatric destinations + free-text; motivo/resumo = `Textarea`; urgência = `Select` (Rotina/Prioritário/Urgente). Pre-submit guard: `toast.error("Informe a especialidade ou serviço de destino.")`.

**DOC-02 field deltas:** searchable catalog (see exam-catalog-search below); selecting appends an editable line item; free-text add; panel apply expands into the same editable array (D-03); remove via `Trash2` ghost icon-button `aria-label="Remover exame"` (mirror medication-row remove). Empty guard: `toast.error("Adicione pelo menos um exame ao pedido.")`.

**DOC-03 field deltas:** título `Input` + single `RichTextEditor` (see below). NO sections, NO import from `report-templates` (Pitfall 4). Empty guard: `toast.error("Escreva o corpo do relatório.")`.

**DOC-05 delta (in-place edit of prescription-wizard):** add a `blankMode` prop; when true, skip the min-1-medication guard (line 317), start with empty medications/body, CTA label `Gerar receituário`, success toast `Receituário gerado. Download iniciado.`

---

### Component: `<doc>`-card.tsx + `<doc>`-table.tsx

**Card analog:** `components/dashboard/prescriptions/prescription-card.tsx` (lines 1-55) — `p-5` padding, `hover:border-primary/30`, `formatDate(issued_at)` primary line, subtitle, `Baixar PDF` outline button (`Download` icon `mr-1.5 h-4 w-4`) linking `/api/<doc>/[id]/download`, else `PDF não disponível` (`text-xs text-muted-foreground`).

**Table analog:** `components/dashboard/prescriptions/prescription-table.tsx` — row + bulk delete with `AlertDialog` (title `Excluir <doc>?`, confirm `Excluir` → `Excluindo…` `variant="destructive"`, cancel `Cancelar`), `deleteId`/`deleting`/`selected`/`bulkDialogOpen` state, `toast.success("… excluído.")`, `getFriendlyToastMessage` on error. DOC-01 urgency renders as semantic `Badge` (secondary/default/destructive per UI-SPEC Color).

---

### Component: exam-catalog-search.tsx (DOC-02, partial match)

**Analog:** `components/dashboard/report-templates/report-template-search-input.tsx` (lines 1-42) for the normalize/filter input UX (Search icon, clear button). Keep the panel items as an editable array in wizard state (D-03). The catalog list itself is a simple client-side filtered list (lower-risk default; `cmdk`/`command.tsx` optional). **The catalog rows/panels are relational reference data — no direct code analog for the data model.**

---

### Component: DOC-03 rich-text body

**Analog:** `components/ui/rich-text-editor.tsx` — export `RichTextEditor`, props `{ value: string; onChange: (html: string) => void; placeholder?: string }` (verified lines 10-35). Reuse the LOW-LEVEL editor only; placeholder e.g. `Escreva o relatório…`. **Never** the multi-section `report-template-sections-editor.tsx` (Pitfall 4).

---

### Template modules: `modules/<doc>-templates/*`

**Analogs (all exact):** `modules/prescription-templates/{create,get-by-profile-id,get-by-id-for-profile,update,delete}-prescription-template.ts` + `types.ts`.
- create (lines 13-38): insert `{ profile_id, name: name.trim(), snapshot }`, return id, `[<DOC>_TEMPLATES]` throw.
- get-by-profile-id (lines 9-26): `.select("id, name, created_at, snapshot").eq("profile_id", profileId).order("name")`.
- types.ts (lines 3-25): `<Doc>TemplateSnapshot` (doc-specific fields) + `<Doc>Template` + `<Doc>TemplateOption`.

> Ownership note: `delete-prescription-template.ts` (lines 7-21) is id-only and relies on RLS + a caller-supplied ownership check. Prefer adding `.eq("profile_id", profileId)` to the new template delete modules (defense-in-depth, consistent with the document delete fix) OR use the `get-…-for-profile` gate before delete. Flag this small hardening for the planner.

---

### Migrations: table + RLS + storage triple

**Table analog:** `supabase/migrations/20260315000000_prescriptions.sql` (lines 1-35) — `id uuid pk`, `profile_id … references profiles(id) on delete cascade`, `patient_id … on delete set null`, `case_id … on delete set null`, `payload jsonb not null default '{}'`, `location_state text`, `issued_at date not null`, `pdf_storage_path text`, `created_at`/`updated_at`, `idx_<doc>_profile_id`, `idx_<doc>_issued_at desc`, `set_updated_at_<doc>` trigger.

**Table RLS analog:** `supabase/migrations/20260604000000_rls_prescriptions.sql` (lines 7-44) — `enable row level security` + 4 policies (select/insert/update/delete) with predicate `profile_id in (select id from public.profiles where auth_user_id = auth.uid())`. Enable + all policies in the SAME file.

**Storage analog:** `supabase/migrations/20260315010000_storage_prescriptions.sql` (lines 1-42) — private bucket (`public=false`), 4 policies keyed to `(storage.foldername(name))[1] in (select id::text from profiles where auth_user_id = auth.uid())`.

**Template table analog:** `supabase/migrations/20260316010000_create_prescription_templates.sql` (lines 1-26) — `profile_id`, `name text not null`, `snapshot jsonb`, `idx_<doc>_templates_profile_id`, updated_at trigger. (No storage/PDF for templates.)

**DOC-02 catalog/panels (partial):** `exam_catalog_items` and `exam_panels` are relational reference tables (no `payload`/`pdf_storage_path`). Follow the template migration for structure (profile_id-scoped + RLS + updated_at) but with typed columns (`name text`, `panel_items text[]` or a join). Open question (RESEARCH §Open Questions 1): shared reference vs per-profile — default per-profile if unsure.

---

## Shared Patterns

### Authentication + Paid Gate (D-15, ASVS V4)
**Source:** `actions/patient-growth/create-measurement.ts` lines 34-39 (canonical two-line preamble) + `modules/supabase/get-authenticated-user`.
**Apply to:** EVERY new action AND every new `app/api/*/route.ts`.
```typescript
const { profile } = await getAuthenticatedUser(supabase)
if (!profile) return { ok: false, error: "Sessão não encontrada." }
if (profile.status !== "paid")
  return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
```
> `generate-prescription.ts` omits the paid line (only checks `profile?.id`); new docs must ADD the paid gate (create-measurement is the correct model).

### Ownership Scoping / IDOR Defense (D-15, CONCERNS Pitfall 5)
**Source:** `modules/prescriptions/delete-prescription.ts` (post-fix) + `app/api/prescriptions/[id]/download/route.ts` lines 24-29.
**Apply to:** EVERY read/write/delete module and every download route.
- Every query includes `.eq("profile_id", profileId)` (delete/download add `.eq("id", …)` too).
- Thread `profile.id` from the action into every mutation module as an explicit `profileId` param.
- Never `createAdminClient()` on user-triggered paths; storage RLS handles bucket deletes.
- Add table RLS + storage RLS migrations (defense-in-depth). Add a `delete-<doc>.spec.ts` ownership no-op test.

### Error Handling
**Source:** modules throw `throw new Error("[DOMAIN] …")`; actions catch → discriminated union.
**Apply to:** all modules (throw) + all actions (catch → `{ ok:false, error }`). Client surfaces via `toast.error(getFriendlyToastMessage(result.error))` — never raw `[DOMAIN]` strings. Validation errors via `zodErrorToUserMessage` (from `actions/prescriptions/generate-prescription.ts` line 53).

### PDF Build (D-16, Pitfall 2)
**Source:** `@falaped/falaped-kit/pdf` — `buildMedicalCertificatePdf` (title + single body) for DOC-01/02/03/06; `htmlToPlainTextForPdf` for TipTap. Verified signature in `node_modules/@falaped/falaped-kit/dist/**/*.d.ts` (`MedicalCertificatePdfInput`). **Never** `import PDFDocument from "pdfkit"`; **never** `buildReportPdf`.

### PDF Download / Storage
**Source:** `${profileId}/${docId}.pdf` path (upload module) + signed-URL redirect route + private bucket per doc type. Add `<DOC>_BUCKET` constant to `lib/constants.ts` (line 8 pattern).

### Patient Auto-fill Header
**Source:** payload `patientName`/`birthDate` (prescription payload); age via `lib/compute-pediatric-age.ts` `computePediatricAge` (UI-SPEC). Entry via `?patientId=`/`?caseId=` or `MedicalCertificatePatientPickerSheet` standalone (D-13).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| DOC-02 exam catalog + default panels SEED rows | data | — | **Clinical content — human-verify checkpoint (RESEARCH Pitfall 3, Assumptions A2).** No code analog; agent must NOT author exam names/panels. Structure the tables/seed mechanism only; gate content behind `checkpoint:human-verify`. |
| DOC-06 guidance milestone SEED texts | data | — | **Clinical content — human-verify checkpoint (Pitfall 3, Assumptions A3).** Milestone *labels* (1ª consulta, 1m…24m, anual) are structural and verified (A1); the guidance *text* per milestone must be doctor-signed-off, not fabricated. |
| DOC-02 `exam_catalog_items` / `exam_panels` data model | model | CRUD | Partial only — relational reference tables have no exact analog (prescriptions use JSONB payload). Template migration is the nearest structural mold; the searchable-list UX borrows `report-template-search-input.tsx`. RESEARCH Open Question 1 (shared vs per-profile) is unresolved — planner to decide. |

> **Seed content handling:** For both seed items above, the planner MUST create a `checkpoint:human-verify` task that presents the milestone list and an exam-catalog *proposal* for the doctor to approve/edit. No migration or seed file may contain agent-authored clinical text/values without a preceding human-verify task (mirror the WHO/vaccine-data blocker treatment from Phases 3 & 5).

---

## Metadata

**Analog search scope:** `modules/{prescriptions,prescription-templates,medical-certificates}/`, `actions/{prescriptions,medical-certificates,patient-growth,prescription-templates}/`, `components/dashboard/{prescriptions,medical-certificates,report-templates}/`, `components/ui/{rich-text-editor,combobox}.tsx`, `app/dashboard/prescriptions/`, `app/api/prescriptions/`, `lib/schemas/`, `lib/constants.ts`, `supabase/migrations/`, `node_modules/@falaped/falaped-kit/dist`.
**Files scanned:** ~40 analog files read (full or targeted).
**Pattern extraction date:** 2026-07-10

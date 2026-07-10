# Phase 4: Documentos Clínicos Novos - Research

**Researched:** 2026-07-10
**Domain:** Clinical document generation (form/wizard → JSONB payload → PDF via kit), reusing the existing prescriptions/medical-certificates pattern in a Next.js 16 / Supabase app
**Confidence:** HIGH (internal pattern verified by direct code reads; only clinical seed content is LOW/unverifiable)

## Summary

This phase adds five new document artifacts (encaminhamento, pedido de exames, relatório médico, receituário em branco, biblioteca de orientações) plus savable templates. It is almost entirely a **reuse-the-existing-pattern** phase: the codebase already ships a mature, three-layer document pipeline (`prescriptions`, `medical-certificates`, `prescription-templates`, `report-templates`) that these new docs clone. **No new npm packages are required** — TipTap, Zod, `@falaped/falaped-kit/pdf`, Supabase, shadcn/ui are all already installed and in use.

The single most important discovery: `@falaped/falaped-kit/pdf` (v0.2.7, installed) already exports the PDF builders these docs need — `buildMedicalCertificatePdf` (title + single free `body` string + optional daysOff/cid) and `buildReportPdf` (multi-section prontuário layout), alongside `htmlToPlainTextForPdf` for converting TipTap rich-text HTML to PDF-safe text. This means the relatório médico (DOC-03, título + single rich-text body per D-10) maps directly onto the `buildMedicalCertificatePdf` shape (title + body), NOT the multi-section `buildReportPdf` — reinforcing D-10's explicit instruction to avoid the sections structure. Encaminhamento and pedido de exames render their structured fields into the `body` string the same way medical-certificates does via `getMedicalCertificateBodySegments` → joined text.

The only genuinely new engineering (beyond cloning) is the **exam catalog + panels data model** (DOC-02) and the **guidance/orientações library** (DOC-06). Both hinge on **clinical seed content that requires the doctor's accuracy sign-off at build time** — treat exactly like the WHO/vaccine data blockers. Research confirms the puericultura milestone schedule structure (SBP/MS: 1st week/1m, 2m, 4m, 6m, 9m, 12m, 18m, 24m, then annual) but the actual guidance texts and exam catalog contents must NOT be fabricated by the agent.

**Primary recommendation:** Clone the `prescriptions` + `prescription-templates` + `medical-certificates` stacks per document type (one module dir, one action barrel, one top-level route, one migration+RLS pair each). Use `buildMedicalCertificatePdf` for DOC-01/DOC-02/DOC-03 bodies (title + composed body text), reuse `htmlToPlainTextForPdf` for the DOC-03 TipTap body, model catalog/panels/guidance as owner-scoped tables with `checkpoint:human-verify` gates on all seed data, and ship DOC-05 as a "blank mode" flag on the existing prescription wizard (least new code, per D-14).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Document form/wizard UI (patient picker, fields, template picker) | Browser / Client (`components/dashboard/<domain>/`) | Frontend Server (route page loads data) | Interactive multi-step state; mirrors `prescription-wizard.tsx` client component |
| Auth + paid gate, Zod validation, orchestration | API / Backend (Server Actions `actions/<domain>/`) | — | Every mutation crosses the action boundary; gate + `safeParse` live here |
| Data access (insert/get/delete, ownership scoping) | Database / Storage (`modules/<domain>/`) | — | One query per file, injected client, `.eq("profile_id", …)` |
| PDF rendering | API / Backend (module wraps `@falaped/falaped-kit/pdf`) | — | pdfkit is a `serverExternalPackage`; runs server-side only, never client |
| PDF persistence + signed download | Database / Storage (Supabase Storage bucket per doc type) | API (upload + signed URL in action/route) | Same `{profileId}/{docId}.pdf` path + storage RLS as prescriptions |
| Exam catalog / panels / guidance seed | Database / Storage (owner-scoped or reference tables) | — | Seed rows; clinical content requires human-verify before commit |

## Project Constraints (from CLAUDE.md)

These are as binding as locked decisions. The planner must not recommend anything contradicting them.

- **Three-layer architecture:** `app/ → actions/ → modules/`. One exported function per file in `modules/`; named exports only; JSDoc on exports.
- **Modules receive `SupabaseClient` by injection** (first arg). Never construct clients in modules; never import `next/cache` or `next/headers` in modules.
- **Every action/route:** `getAuthenticatedUser(supabase)` → gate on `profile.status === "paid"` → Zod `safeParse` at the boundary → delegate to modules. Actions return discriminated unions `{ ok: true, … } | { ok: false; error: string }`. Modules `throw new Error("[DOMAIN] …")`.
- **All data access scoped by `profile_id`** (+ `patient_id` when patient-linked) on read/write/delete.
- **PDF via `@falaped/falaped-kit/pdf`** (pdfkit as `serverExternalPackage`) — do not rebuild the builder; the Phase-1 print fix is inherited.
- **PT-BR** for all user-facing strings. Files kebab-case, functions camelCase, types/components PascalCase, server actions suffixed `Action`.
- **Zod ^4** for validation; `lib/zod-error-message.ts` maps issues to PT-BR. Shared schemas in `lib/schemas/`.
- **Tooling:** yarn (1.22.22), ESLint only (no Prettier), TS strict, 2-space indent, double quotes, path alias `@/*`.
- **Privacy:** child data is sensitive; scope storage access to the owning doctor.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pedido de exames (DOC-02)**
- **D-01:** Catálogo de exames = **catálogo pediátrico seed + busca + texto livre**. Ship um catálogo pesquisável de exames comuns (hemograma, EAS, etc.) E permitir o médico digitar itens fora do catálogo.
- **D-02:** Painéis reutilizáveis (ex: "rotina lactente") = **alguns painéis default seed + painéis criados pelo médico**. Não deferir painéis.
- **D-03:** Ao aplicar um painel, os itens entram como **itens editáveis no pedido** (o médico adiciona/remove antes de gerar o PDF) — não como bloco fixo.

**Biblioteca de orientações (DOC-06)**
- **D-04:** Conteúdo inicial = **seed editável** — um conjunto inicial de textos de orientação por marco que o médico revisa/edita antes de usar (NÃO vazio).
- **D-05:** Organização por **marcos do calendário de puericultura padrão**: 1ª consulta, 1m, 2m, 4m, 6m, 9m, 12m, 18m, 24m, depois anual. O médico pode adicionar marcos próprios.
- **D-06:** Uso = **documento próprio imprimível com auto-fill do paciente** (seleciona a orientação de um marco → cabeçalho auto-preenchido → PDF), mesmo padrão dos outros documentos. (Anexar à receita fica fora deste escopo.)

**Encaminhamento (DOC-01)**
- **D-07:** Especialidade/serviço de destino = **picklist de destinos pediátricos comuns + texto livre** (ORL, oftalmo, neuroped, fono, fisio, nutri… + "outro" livre).
- **D-08:** Níveis de urgência = **Rotina / Prioritário / Urgente** (três níveis).
- **D-09:** Campos herdados do requisito: especialidade/serviço, motivo, resumo clínico/hipótese, urgência; PDF auto-preenchido com dados do paciente.

**Relatório médico (DOC-03)**
- **D-10:** Estrutura = **campo título/finalidade + um único corpo rich-text livre (TipTap)**, cabeçalho auto-preenchido com dados do paciente. Deliberadamente mais simples/diferente do laudo multi-seção — mantém a separação visual e conceitual do laudo/relatório de caso existente.

**Templates (DOC-04)**
- **D-11:** Encaminhamento, pedido de exames e relatório médico têm **templates salváveis** seguindo o mesmo padrão de `prescription-templates` (per-médico, escopo `profile_id`).

**Navegação e ponto de entrada**
- **D-12:** Navegação = **rota top-level separada por tipo de documento** (consistente com `/dashboard/prescriptions` e `/dashboard/medical-certificates`), não um hub unificado.
- **D-13:** Ponto de entrada = **a partir do perfil do paciente (auto-fill nome/DOB/idade) + fluxo avulso com seletor de paciente** — espelha como as receitas funcionam hoje (por-paciente e por-caso).
- **D-14:** Receituário em branco (DOC-05) = **um modo "em branco/vazio" do fluxo de receita existente** (mesmo layout, corpo vazio) — não um tipo de documento separado.

**Cross-cutting**
- **D-15:** Todo documento novo aplica o preâmbulo `getAuthenticatedUser` + gate `profile.status !== "paid"` e escopa `profile_id` (+ `patient_id`) em toda leitura/escrita/exclusão (Pitfall 5 IDOR).
- **D-16:** PDF gerado via `@falaped/falaped-kit/pdf` herdando a correção de impressão da Phase 1 (sem página em branco extra) — não refazer o builder.

### Claude's Discretion
- Forma exata do armazenamento do payload (JSONB `payload` como nas receitas vs colunas dedicadas) — decisão de research/planning, seguindo o analog de `prescriptions`/`medical_certificates`.
- Se AI-assist (Groq) entra no corpo do relatório médico como em `report-templates/generate-with-ai-content` — não decidido; fica a critério do planner (não é requisito desta fase, pode ser deixado de fora do MVP).
- Compartilhamento de templates (global vs per-médico) — seguir o padrão existente (per-médico) salvo indicação contrária.

### Deferred Ideas (OUT OF SCOPE)
- **Extração/transcrição de exames por foto via IA** — v2.
- **AI-assist (Groq) no corpo do relatório médico** — possível, mas não requisito; provavelmente fora do MVP desta fase.
- **Anexar orientações dentro da receita** — orientações são documento próprio (D-06).
- **Hub "Documentos" unificado** — preterido em favor de rotas separadas (D-12).
- **Content accuracy checkpoint:** os dados **seed** (catálogo de exames D-01, painéis default D-02, textos de orientação D-06) são **conteúdo clínico** e exigem sign-off de acurácia do médico no build (mesmo tratamento dos blockers WHO/vacina). Não commitar conteúdo clínico seed sem checkpoint human-verify.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | Encaminhamento (especialidade/serviço, motivo, resumo clínico/hipótese, urgência) com PDF auto-preenchido | Clone `prescriptions` module/action/route/migration; specialty picklist + free-text + urgency enum in JSONB payload; render fields into `buildMedicalCertificatePdf` `body` (title="ENCAMINHAMENTO"). Wizard/patient-picker/auto-fill from `prescription-wizard.tsx` + `MedicalCertificatePatientPickerSheet`. |
| DOC-02 | Pedido de exames: catálogo pesquisável + painéis reutilizáveis + hipótese/observações → PDF | New owner-scoped tables `exam_catalog_items`, `exam_panels` (+ default panels seed). Searchable UI mirrors `report-template-search-input.tsx` normalize/filter pattern. Panel apply → editable items array in payload (D-03). PDF body = list of selected items + hipótese + observações via `buildMedicalCertificatePdf`. **Seed content = human-verify checkpoint.** |
| DOC-03 | Relatório médico de corpo livre (rich text) com PDF — tipo NOVO separado do laudo | Clone `medical-certificates` shape: título + single TipTap body. Use `RichTextEditor` (`components/ui/rich-text-editor.tsx`) + `htmlToPlainTextForPdf` → `buildMedicalCertificatePdf({ certificateTitle, body })`. **Do NOT use `buildReportPdf` (multi-section) — D-10.** |
| DOC-04 | Salvar/reutilizar templates de encaminhamento, pedido de exames, relatório | Clone `prescription-templates` per doc type (per-médico, `profile_id`-scoped, JSONB `snapshot`). "Salvar como template" + "Usar template" pattern already in `prescription-wizard.tsx`. |
| DOC-05 | Receituário em branco (layout de receita, corpo vazio) | "Blank mode" flag on existing prescription wizard/route (D-14) — no new document type. Empty medications/body, same PDF builder. Least new code. |
| DOC-06 | Biblioteca de orientações por marco (1ª consulta, 1m, 2m…) — selecionar e imprimir | Owner-scoped `guidance_templates` table keyed by milestone; seed editable texts (D-04). Milestone schedule verified: SBP/MS 1st week/1m,2m,4m,6m,9m,12m,18m,24m,annual. Own printable doc with patient auto-fill via `buildMedicalCertificatePdf`. **Seed text = human-verify checkpoint.** |
</phase_requirements>

## Standard Stack

**No new dependencies.** Everything required is already installed and in active use. Verified against `package.json` and `node_modules`.

### Core (all present)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@falaped/falaped-kit` | 0.2.7 | PDF builders (`/pdf` subpath) | Ships `buildMedicalCertificatePdf`, `buildReportPdf`, `buildPrescriptionPdf`, `htmlToPlainTextForPdf`; Phase-1 print fix baked in [VERIFIED: codebase — node_modules/@falaped/falaped-kit dist .d.ts + package.json] |
| `zod` | ^4.3.6 | Boundary validation | Existing schema pattern in `lib/schemas/*`, discriminated-union payloads (`medical-certificate.ts`) [VERIFIED: codebase — package.json + lib/schemas] |
| `@tiptap/*` | ^3.20.1 | Rich-text body (DOC-03) | Already wrapped in `components/ui/rich-text-editor.tsx`; used in prescription wizard [VERIFIED: codebase — CLAUDE.md + prescription-wizard.tsx imports] |
| `@supabase/supabase-js` + `@supabase/ssr` | latest | DB/Storage/Auth per-request clients | `lib/supabase/{server,client,proxy}.ts` factories [VERIFIED: codebase] |
| `react-hook-form` + `@hookform/resolvers` | ^7.71.2 / ^5.2.2 | Form state (where used) | Existing; wizard state is often plain `useState` (see prescription-wizard) [VERIFIED: codebase] |
| shadcn/ui + `radix-ui` + `@base-ui/react` | 3.8.5 / ^1.4.3 / ^1.2.0 | UI primitives (Card, Dialog, Sheet, Input, Field, Button) | Direct reuse from prescription-wizard [VERIFIED: codebase] |
| `date-fns` | ^4.1.0 | Date formatting (ptBR) | `format(…, { locale: ptBR })` in generate actions [VERIFIED: codebase] |
| `sonner` | ^2.0.7 | Toasts | `getFriendlyToastMessage` wrapper [VERIFIED: codebase] |

### Supporting (present, use as needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/compute-pediatric-age.ts` | in-repo | Pediatric age for auto-filled headers | DOC-01/02/03/06 patient header (`computePediatricAge`, AgeBand days/weeks/months_days/years_months) [VERIFIED: codebase] |
| `cmdk` | ^1.1.1 | Command/search menu | Optional for the searchable exam catalog (DOC-02) if a command-palette UX is chosen; simple filtered list (report-template-search-input pattern) is the lower-risk default |
| `groq-sdk` + `@falaped/falaped-kit/groq` | ^0.37.0 / 0.2.7 | AI-assist body draft | ONLY if planner opts DOC-03 AI-assist in (Claude's discretion, likely out of MVP) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `buildMedicalCertificatePdf` for DOC-01/02/03 bodies | `buildReportPdf` (multi-section) | `buildReportPdf` is the multi-section prontuário layout with dotted lines per section — it contradicts D-10's "single free body" and is the wrong analog for these docs. Use it nowhere in this phase. |
| JSONB `payload` column | Dedicated typed columns per field | JSONB matches the established `prescriptions`/`medical_certificates` analog, keeps migrations minimal, and payloads here are document-shaped (not queried by field). **Recommend JSONB** (Claude's discretion D). Exception: DOC-02 catalog/panels are relational reference data → dedicated tables/columns. |
| Plain `useState` wizard (prescription-wizard style) | `react-hook-form` per doc | Match the analog you clone: the prescription wizard uses `useState`; medical-certificate forms use RHF. Follow whichever analog the doc most resembles to minimize divergence. |

**Installation:** None. `yarn install` already satisfies all requirements; do not add packages.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** All libraries are pre-existing project dependencies verified present in `node_modules` and `package.json`. No `npm install` / `yarn add` step is planned. If the planner introduces any new package (it should not), run the Package Legitimacy Gate first.

## Architecture Patterns

### System Architecture Diagram (per document type — identical shape for DOC-01/02/03/06; DOC-05 reuses prescriptions)

```
Patient profile  ─┐
(auto-fill        │
 name/DOB/age)    ├─► [Route page  app/dashboard/<doc>/new/page.tsx]
                  │      loads: patients, profile, templates (server component)
Standalone picker ┘                    │
                                       ▼
                        [Client wizard  components/dashboard/<doc>/<doc>-wizard.tsx]
                          state: patient | manual | template
                          fields: (doc-specific) + optional "Usar template" / "Salvar como template"
                                       │  buildPayload()
                                       ▼
                        [Server Action  actions/<doc>/generate-<doc>.ts]  "use server"
                          1. createClient() → getAuthenticatedUser
                          2. gate: profile.status === "paid"          ── fail ─► { ok:false, error }
                          3. Zod safeParse(payload)                   ── fail ─► { ok:false, error (PT-BR) }
                          4. resolve doctor/logo/location/issuedAt
                                       │
              ┌────────────────────────┼────────────────────────────┐
              ▼                        ▼                             ▼
   [module generate-pdf]     [module insert-<doc>]        [module upload-<doc>-pdf]
   buildMedicalCertificatePdf   INSERT ... profile_id,       storage {profileId}/{docId}.pdf
   ({title, body, doctor…})     patient_id, payload jsonb     (bucket per doc, RLS owner-scoped)
   → Buffer                     → docId                       → pdf_storage_path
              │                        │                             │
              └────────────────────────┴──────────► [module update-<doc>-pdf-path]
                                       │
                                       ▼
                          { ok:true, pdfBase64, filename }
                                       │
                                       ▼
                        Client: base64 → Blob → download; router.push list; refresh
```

External boundaries: Supabase (Postgres table + Storage bucket, both RLS owner-scoped); `@falaped/falaped-kit/pdf` (pdfkit server-external). All data access filtered by `profile_id` (+ `patient_id`).

### Recommended Project Structure (mirrors existing domains exactly)

```
app/dashboard/
├── referrals/                 # DOC-01 encaminhamento  (top-level route, D-12)
│   ├── page.tsx               # list (server component; getReferralsByProfileId)
│   ├── loading.tsx
│   └── new/page.tsx           # wizard wrapper + ?patientId=/?caseId= handling (D-13)
├── exam-requests/             # DOC-02 pedido de exames
├── medical-reports/           # DOC-03 relatório médico (NOT "reports"/report-templates — new type)
├── guidance/                  # DOC-06 orientações
└── prescriptions/             # DOC-05 = add "?mode=blank" to existing new/page.tsx

actions/<domain>/              # generate-*.ts, delete-*.ts, delete-*-bulk.ts, template CRUD, index.ts
modules/<domain>/              # insert / get-by-{patient,profile,case} / delete / generate-pdf /
                               # upload-pdf / update-pdf-path / types.ts  (one fn per file)
modules/<domain>-templates/    # create/update/delete/get-* + types.ts  (DOC-04)
components/dashboard/<domain>/ # <domain>-wizard.tsx, -card.tsx, -table.tsx
lib/schemas/<domain>.ts        # zod payload + generate schema (PT-BR messages)
supabase/migrations/           # <ts>_<domain>.sql (table+trigger+index) + <ts>_rls_<domain>.sql
                               # + <ts>_storage_<domain>.sql (bucket + storage RLS)
```

Use domain slugs consistent with existing English table naming (`prescriptions`, `medical_certificates`). Suggested: `referrals`, `exam_requests`, `medical_reports`, `guidance_templates`, `exam_catalog_items`, `exam_panels` (planner to confirm exact names).

### Pattern 1: Clone-the-document-domain (the canonical pattern)
**What:** Each new doc type is a near-copy of `modules/prescriptions/` + `actions/prescriptions/` + a top-level route + a migration+RLS+storage triple.
**When to use:** DOC-01, DOC-02, DOC-03, DOC-06 (DOC-05 reuses prescriptions directly).
**Example (module + action skeleton, verified against real files):**
```typescript
// Source: modules/prescriptions/insert-prescription.ts [VERIFIED: codebase]
export async function insertReferral(
  supabase: SupabaseClient,
  params: { profileId: string; patientId: string | null; caseId: string | null;
            payload: Record<string, unknown>; locationState: string; issuedAt: string },
): Promise<string> {
  const { data, error } = await supabase
    .from("referrals")
    .insert({ profile_id: params.profileId, patient_id: params.patientId,
              case_id: params.caseId, payload: params.payload,
              location_state: params.locationState, issued_at: params.issuedAt,
              pdf_storage_path: null })
    .select("id").single()
  if (error) throw new Error(`[REFERRALS] insert failed: ${error.message}`)
  if (!data?.id) throw new Error("[REFERRALS] insert returned no id")
  return data.id as string
}
```
```typescript
// Source: actions/prescriptions/generate-prescription.ts + actions/patient-growth/create-measurement.ts [VERIFIED: codebase]
export async function generateReferralAction(params: {...}): Promise<GenerateReferralResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
  const parsed = generateReferralSchema.safeParse({ payload: params.payload, ... })
  if (!parsed.success) return { ok: false, error: zodErrorToUserMessage(parsed.error) }
  // resolve doctor/logo/location/issuedAt → buildPdf → insert → uploadPdf → updatePdfPath
  // return { ok: true, pdfBase64, filename }
}
```

### Pattern 2: Structured fields → single PDF body string
**What:** DOC-01 (specialty/reason/summary/urgency) and DOC-02 (item list + hipótese + observações) compose their structured fields into one `body` string passed to `buildMedicalCertificatePdf`.
**When to use:** DOC-01, DOC-02, DOC-06.
**Example:**
```typescript
// Source: modules/medical-certificates/generate-medical-certificate-pdf.ts (bodySegmentsToText) [VERIFIED: codebase]
// Build a PT-BR body from structured fields, then:
return buildMedicalCertificatePdf({
  certificateTitle: "ENCAMINHAMENTO",     // or "PEDIDO DE EXAMES" / "ORIENTAÇÕES"
  patientName, date: issuedAtFormatted,
  body,                                    // composed multi-paragraph string
  doctorName, doctorCrm, doctorRqe,
  consultationDateFormatted: issuedAtFormatted,
  consultationLocation: locationDisplay,
  logoFooter: logoBuffer ?? undefined,
})
```

### Pattern 3: Rich-text (TipTap) body → PDF (DOC-03)
**What:** Editor stores HTML; convert to PDF-safe text before rendering.
**Example:**
```typescript
// Source: modules/prescriptions/generate-prescription-pdf.ts [VERIFIED: codebase]
import { htmlToPlainTextForPdf, buildMedicalCertificatePdf } from "@falaped/falaped-kit/pdf"
const bodyText = htmlToPlainTextForPdf(payload.bodyHtml)   // TipTap HTML → text
return buildMedicalCertificatePdf({ certificateTitle: payload.title, body: bodyText, ... })
```

### Pattern 4: Savable template (DOC-04)
**What:** Per-doctor JSONB `snapshot` table; "Salvar como template" writes it, "Usar template" applies it to wizard state.
**Example:** Clone `modules/prescription-templates/` (`create/update/delete/get-*` + `types.ts` with a `snapshot` shape) and the Dialog/Sheet UI already in `prescription-wizard.tsx` (lines ~271–313, 622–729). [VERIFIED: codebase]

### Pattern 5: Migration + table RLS + storage RLS triple
**What:** Each doc table ships three migrations: table (with `set_updated_at` trigger + `profile_id` index), table RLS (4 policies keyed to `profiles.auth_user_id = auth.uid()`), storage bucket+RLS (`(storage.foldername(name))[1]` = profile id).
**Example:** Clone `20260315000000_prescriptions.sql`, `20260604000000_rls_prescriptions.sql`, `20260315010000_storage_prescriptions.sql`. [VERIFIED: codebase]

### Pattern 6: Searchable catalog (DOC-02)
**What:** Client-side filtered list over a fetched catalog, normalize-and-match on typed query; free-text add for off-catalog items; panel apply expands into editable items.
**Recommendation:** Reuse the `report-template-search-input.tsx` normalize/filter approach for the list; keep panel items as an editable array in wizard state (D-03). A relational `exam_catalog_items` table (owner-scoped or shared reference) + `exam_panels` (with default panels seeded) is the model; the payload stores the final chosen item strings so the PDF is self-contained even if the catalog changes later.

### Anti-Patterns to Avoid
- **Using `buildReportPdf` for the medical report (DOC-03).** It is the multi-section prontuário layout — D-10 explicitly wants a single free body. Use `buildMedicalCertificatePdf`.
- **Making the medical report a variant of `report-templates`/laudo.** It is a NEW, separate type (PROJECT.md + D-10). Do not thread it through the existing case-report/laudo code.
- **Deleting by `id` only.** The historical IDOR bug (CONCERNS Pitfall 5) came from `.delete().eq("id", …)` without `profile_id`. Always `.eq("id", …).eq("profile_id", profileId)` (and thread `profile.id` from action into module).
- **Service-role admin client on user delete paths.** CONCERNS flagged `createAdminClient()` widening IDOR blast radius. Use the user-scoped client; storage RLS handles bucket deletes (see current `deletePrescription`).
- **Committing clinical seed content without a human-verify checkpoint.** Catalog/panels/guidance texts are clinical content — same treatment as WHO/vaccine blockers.
- **Fetching PDF-related data in the browser tier.** PDF build is server-only (pdfkit is a `serverExternalPackage`); keep it in the action/module.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF layout (header/footer/signature/print fix) | Custom pdfkit layout | `@falaped/falaped-kit/pdf` `buildMedicalCertificatePdf` / `buildReportPdf` | Phase-1 print fix + consistent letterhead already baked in (D-16) |
| Rich-text → PDF text | HTML-strip regex | `htmlToPlainTextForPdf` from the kit | Handles TipTap HTML edge cases; already used by prescriptions |
| Patient picker / auto-fill | New picker | `MedicalCertificatePatientPickerSheet` + wizard patient/manual/template state | Exists, tested in prod by prescription wizard |
| Template snapshot save/apply | New template UX | Clone `prescription-templates` + the Dialog/Sheet in `prescription-wizard.tsx` | Same per-médico JSONB snapshot pattern (D-11) |
| Auth + paid gate | Re-check logic | `getAuthenticatedUser(supabase)` + `profile.status === "paid"` | Canonical preamble (D-15) |
| Tenant isolation | Ad-hoc filters | `.eq("profile_id", …)` in every query + table RLS + storage RLS (clone existing migrations) | IDOR history; RLS is the defense-in-depth backstop |
| Zod → PT-BR errors | Manual messages | `zodErrorToUserMessage` / `lib/zod-error-message.ts` | Existing, localized |
| Pediatric age in header | Date math | `computePediatricAge` (`lib/compute-pediatric-age.ts`) | Phase-1 engine, handles bands + edge cases |
| Date formatting | Manual | `date-fns` `format(…, { locale: ptBR })` + `lib/formatters.formatDate` | Existing convention |

**Key insight:** This phase's risk is not technical novelty — it's *divergence*. Every new doc that copies the analog faithfully is low-risk; every place a task "improves" on the pattern (new PDF builder, new picker, new template mechanism, a delete without `profile_id`) reintroduces solved problems. Prescriptiveness beats creativity here.

## Common Pitfalls

### Pitfall 1: IDOR on delete/mutation (missing `profile_id` filter)
**What goes wrong:** A delete/update scoped only by `id` lets one doctor mutate another's document.
**Why it happens:** Copying an older version of the analog, or the doc-comment myth "RLS ensures ownership" while forgetting the app-layer filter.
**How to avoid:** Every mutation `.eq("id", …).eq("profile_id", profileId)`; thread `profile.id` from the action into the module (current `deletePrescription` does this — clone the *current* version, not the pre-fix one). Add table RLS migration too (defense-in-depth). Consider a `*.spec.ts` ownership test per delete module (CONCERNS calls this out as the gap that would have caught the original bug).
**Warning signs:** A delete module signature without a `profileId` param; a query with a single `.eq`.

### Pitfall 2: Extra blank PDF page / footer spacing (CONS-04 regression)
**What goes wrong:** New PDF path bypasses the kit builder or re-implements layout, losing the Phase-1 fix.
**Why it happens:** Hand-rolling pdfkit for "just this one doc."
**How to avoid:** Always go through `@falaped/falaped-kit/pdf`. Success criterion #1 requires "sem página em branco extra." Verify each new doc's PDF at 1 page, ~1.05 page, and multi-page (Phase-1 verification protocol).
**Warning signs:** `import PDFDocument from "pdfkit"` appearing in a new module.

### Pitfall 3: Fabricated clinical seed content
**What goes wrong:** Agent invents exam names, default panels, or guidance texts that are clinically wrong → liability for a real pediatrician.
**Why it happens:** LLM fills the gap to "complete" the feature.
**How to avoid:** Structure the tables and seeding *mechanism*, but gate all seed *content* behind a `checkpoint:human-verify` task. Provide the doctor a review template (milestone list confirmed below; exam list as a proposal to approve/edit). Never commit seed rows without sign-off. Mirror the WHO/vaccine-data blocker treatment already established for Phases 3 & 5.
**Warning signs:** A migration or seed file containing specific clinical text/values authored by the agent with no human-verify predecessor task.

### Pitfall 4: Medical report bleeding into the existing laudo/case-report
**What goes wrong:** DOC-03 gets built as a variant of `report-templates`/case reports, breaking the conceptual separation.
**Why it happens:** Name collision ("report") and the tempting existing rich-text sections editor.
**How to avoid:** New domain (`medical_reports`), new route (`/dashboard/medical-reports`), single free body (not sections), `buildMedicalCertificatePdf`. Reuse only `RichTextEditor` (the low-level UI), not the sections editor.
**Warning signs:** Imports from `modules/report-templates` or `components/dashboard/report-templates` in the medical-report code.

### Pitfall 5: Storing catalog/panel references instead of resolved values in the payload
**What goes wrong:** A generated exam-request PDF later renders wrong/blank because the catalog row it referenced was edited/deleted.
**Why it happens:** Over-normalizing the document payload.
**How to avoid:** The exam-request `payload` should store the *final resolved item strings* the doctor chose (self-contained document snapshot), even though selection was aided by the catalog/panels tables. Matches how prescriptions store `medications` inline in the payload.
**Warning signs:** `payload` holding only `exam_catalog_item_id[]` with no text.

## Runtime State Inventory

Not applicable — this is a **greenfield feature phase** (new tables, routes, modules), not a rename/refactor/migration. No existing runtime state is renamed or migrated. New Supabase tables and storage buckets are created fresh; no stored data, live service config, OS-registered state, secrets/env vars, or build artifacts carry a string that changes. (Verified: phase adds new domains, does not touch existing table/bucket names.)

## Code Examples

### Migration triple (table + trigger + index)
```sql
-- Source: supabase/migrations/20260315000000_prescriptions.sql [VERIFIED: codebase]
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid null references public.patients(id) on delete set null,
  case_id uuid null references public.cases(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  location_state text null,
  issued_at date not null,
  pdf_storage_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_referrals_profile_id on public.referrals (profile_id);
create index idx_referrals_issued_at on public.referrals (issued_at desc);
-- + set_updated_at trigger (clone set_updated_at_prescriptions)
```

### Table RLS (4 policies, same file)
```sql
-- Source: supabase/migrations/20260604000000_rls_prescriptions.sql [VERIFIED: codebase]
alter table public.referrals enable row level security;
create policy "Referrals select own" on public.referrals for select to authenticated
  using (profile_id in (select id from public.profiles where auth_user_id = auth.uid()));
-- + insert (with check), update (using + with check), delete (using) — same predicate
```

### Storage bucket + RLS
```sql
-- Source: supabase/migrations/20260315010000_storage_prescriptions.sql [VERIFIED: codebase]
insert into storage.buckets (id, name, public) values ('referrals','referrals',false)
  on conflict (id) do update set public = false;
create policy "Referrals select own" on storage.objects for select to authenticated
  using (bucket_id = 'referrals'
    and (storage.foldername(name))[1] in (select id::text from public.profiles where auth_user_id = auth.uid()));
-- + insert/update/delete
```

### Ownership-scoped delete (IDOR-safe)
```typescript
// Source: modules/prescriptions/delete-prescription.ts (current, post-fix) [VERIFIED: codebase]
await supabase.from("referrals").delete()
  .eq("id", referralId).eq("profile_id", profileId)   // ownership anchor — never id-only
// then best-effort storage.remove([pdfStoragePath]) with the user-scoped client (log, don't throw)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No table RLS (app-layer filters only) | Table RLS enabled on prescriptions/certificates/patients/cases | migrations `20260604000000–4` | New doc tables MUST ship their own RLS migration; the "RLS absent" note in CONCERNS is partially resolved but new tables start with none |
| `deletePrescription` id-only (IDOR) | id + `profile_id` scoped delete | post-CONCERNS fix (referenced in STATE `deletePrescription`) | Clone the *current* delete module, not the vulnerable original |
| kit `generatePrescriptionPdf` only | kit also exports `buildMedicalCertificatePdf` / `buildReportPdf` / `htmlToPlainTextForPdf` | kit 0.2.7 | DOC-01/02/03/06 need no new kit release |

**Deprecated/outdated:** None relevant. Note the Phase-1 CONS-04 fix shipped as in-repo "Path B"; the kit "Path A" release for the ~1.05-page boundary was deferred to Phase 6 (ROADMAP 01-03) — new docs inherit Path B, which covers 1-page and multi-page.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Puericultura milestone list (1st week/1m, 2m, 4m, 6m, 9m, 12m, 18m, 24m, annual) matches D-05 and SBP/MS | DOC-06 / Requirements | Low — matches D-05 verbatim; confirmed via SBP/MS search (MEDIUM). Milestone *labels* are structural, not clinical text. |
| A2 | Common BR pediatric routine exams (hemograma, EAS, ferritina, glicemia, etc.) are a reasonable catalog *starting proposal* | DOC-02 | HIGH if treated as final — the exam catalog + default panels are CLINICAL CONTENT and MUST be doctor-verified. Never seed without human-verify. |
| A3 | Actual guidance/orientação TEXT per milestone | DOC-06 | HIGH — clinical content; agent must NOT author. Human-verify checkpoint required. |
| A4 | JSONB `payload` (vs dedicated columns) is the right storage shape | Standard Stack / Discretion | Low — matches analog; planner may choose per-column but JSONB is recommended and consistent. |
| A5 | `buildMedicalCertificatePdf` `body` accepts arbitrary composed PT-BR text and renders acceptably for referral/exam/guidance content | Patterns 2–3 | Medium — signature verified (title+body+optional daysOff/cid); layout suits certificate-like bodies. Verify visually per doc in UAT. |
| A6 | Exact new table/route/domain slug names (`referrals`, `exam_requests`, `medical_reports`, `guidance_templates`) | Structure | Low — planner confirms names; pattern is what matters. |

## Open Questions

1. **Exam catalog data ownership: shared reference table vs per-doctor?**
   - What we know: D-01 says seed + search + free-text; D-02 says default panels + doctor-created panels.
   - What's unclear: Whether the base catalog is a global reference (read-only, shared) or seeded per-profile. Doctor-created panels are clearly per-profile (`profile_id`).
   - Recommendation: Base catalog as a shared reference table (no `profile_id`, read-only to all authenticated) OR seeded per-profile; doctor panels always `profile_id`-scoped. Planner to decide with the human-verify content step; default to per-profile if unsure (matches the "editable seed" language of D-04 and keeps one RLS model).

2. **Guidance library: table per milestone row, or one doc type with a `milestone` field?**
   - What we know: D-06 = own printable doc with auto-fill; D-04/D-05 = seeded editable texts by milestone, doctor can add milestones.
   - Recommendation: One `guidance_templates` table (`profile_id`, `milestone` label, `body`/rich-text, `order`), seeded editable; printing composes a doc via `buildMedicalCertificatePdf`. Milestone is a field, not a table.

3. **DOC-03 AI-assist (Groq) in the medical-report body?**
   - What we know: Claude's discretion; not a requirement; Groq + `report-templates/generate-with-ai-content` exist.
   - Recommendation: Leave OUT of the MVP slice. If added, it's an additive optional action mirroring `generate-report-template-sections`, not core to any success criterion.

4. **Tests for new delete/generate actions?**
   - What we know: TESTING doc — only pure functions in `modules/`/`lib/` are tested (`node:test` + `tsx`); actions/components untested; `nyquist_validation` is OFF in config.
   - Recommendation: No test gate is required by config. Optionally add pure-function `*.spec.ts` for any body-composition helper (e.g. `format-*-lines.ts` analog) since those are the testable seams; ownership enforcement is best verified in UAT + code review given the no-mock testing style.

## Environment Availability

Skipped — no new external tools, services, runtimes, or CLIs are introduced. The phase runs entirely on the existing Next.js/Supabase/kit stack already present and used by prior phases (Supabase project + `@falaped/falaped-kit` 0.2.7 confirmed installed). Migrations apply via the same `supabase` workflow used for the Phase-3 `patient_measurements` migration.

## Security Domain

`security_enforcement: true`, ASVS level 1, block on `high`. This phase handles sensitive minors' clinical data behind a paid gate — access control is the dominant concern.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getAuthenticatedUser(supabase)` preamble in every action/route (existing Supabase Auth) |
| V3 Session Management | yes (inherited) | Supabase SSR cookie session via `lib/supabase/proxy.ts`; no new session logic |
| V4 Access Control | **yes (primary)** | Paid gate (`profile.status === "paid"`) + `profile_id` (+`patient_id`) filter on EVERY read/write/delete + table RLS + storage RLS. IDOR is the phase's top risk (D-15, CONCERNS Pitfall 5). |
| V5 Input Validation | yes | Zod ^4 `safeParse` at action boundary; `zodErrorToUserMessage` PT-BR; sanitize TipTap HTML before PDF via `htmlToPlainTextForPdf` |
| V6 Cryptography | no | No new crypto; signed URLs handled by Supabase Storage |
| V7 Error Handling/Logging | yes | Modules throw `[DOMAIN]` errors; actions convert to result unions; no raw errors to client; orphan-PDF logged not thrown |
| V12 Files/Resources | yes | Private per-doc storage buckets, `{profileId}/{docId}.pdf`, storage RLS on `foldername[1]`; PDFs served via signed URL / owner-scoped download route |

### Known Threat Patterns for Next.js Server Actions + Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: delete/read another doctor's document by UUID | Elevation of Privilege / Info Disclosure | `.eq("profile_id", profileId)` on every query + table RLS; NEVER id-only; thread `profile.id` from action → module |
| Missing paid gate on a new action | Elevation of Privilege | `profile.status === "paid"` check as second preamble line (clone `create-measurement` action) |
| Service-role client on user-triggered path | Elevation of Privilege | Use user-scoped client + storage RLS; reserve admin client for `auth.admin.deleteUser` only (CONCERNS) |
| Untrusted patient/case id passed to insert | Tampering | Validate ownership of `patient_id`/`case_id` against the profile (or rely on RLS FK + `profile_id` predicate); scope inserts by `profile_id` |
| Stored XSS via TipTap HTML into PDF/preview | Tampering | Convert to plain text for PDF (`htmlToPlainTextForPdf`); render preview with existing sanitized RichTextEditor pipeline; never `dangerouslySetInnerHTML` raw payload |
| Cross-tenant storage object access | Info Disclosure | Private bucket (`public=false`) + storage RLS keyed to `foldername[1]` = profile id + short-lived signed URLs |
| PII of minors in logs | Info Disclosure | Log error messages, not payload contents (existing `console.error("[DOMAIN] …", e)` pattern) |

**Security verification per new doc (block-on-high):** ownership filter present on all read/write/delete; paid gate present; table + storage RLS migrations present; no admin client on delete; TipTap body sanitized before render/PDF. These map to success criterion #5.

## Sources

### Primary (HIGH confidence — direct code reads this session)
- `modules/prescriptions/{types,insert-prescription,get-prescriptions-by-patient-id,delete-prescription,generate-prescription-pdf,upload-prescription-pdf}.ts` — canonical document pipeline
- `actions/prescriptions/generate-prescription.ts`, `actions/patient-growth/create-measurement.ts` — action preamble (auth + paid gate + Zod + result union)
- `modules/prescription-templates/{types,create-prescription-template}.ts` — savable template pattern (DOC-04)
- `modules/medical-certificates/generate-medical-certificate-pdf.ts` — structured-fields → body-string PDF pattern
- `components/dashboard/prescriptions/prescription-wizard.tsx` — wizard, patient picker, template save/apply, blank-mode basis (DOC-05)
- `supabase/migrations/20260315000000_prescriptions.sql`, `20260604000000_rls_prescriptions.sql`, `20260315010000_storage_prescriptions.sql`, `20260316010000_create_prescription_templates.sql` — migration/RLS/storage triple
- `node_modules/@falaped/falaped-kit/dist/pdf/*.d.ts` + `package.json` (v0.2.7) — kit exports: `buildMedicalCertificatePdf`, `buildReportPdf`, `buildPrescriptionPdf`, `htmlToPlainTextForPdf`, and their input interfaces
- `lib/schemas/medical-certificate.ts` — discriminated-union Zod payload pattern
- `lib/compute-pediatric-age.ts` — age engine signature (AgeBand)
- `.planning/codebase/CONCERNS.md` (IDOR Pitfall 5, service-role concern), `TESTING.md` (node:test, pure-fn only, no mocks), `CLAUDE.md`, `.cursor/skills/{supabase-falaped,storage-pdfs}/SKILL.md`

### Secondary (MEDIUM confidence — web, checked against official orgs)
- Sociedade Brasileira de Pediatria / Ministério da Saúde puericultura schedule (min 7 visits year 1; 18m/24m; then annual) — confirms D-05 milestone structure. https://www.sbp.com.br/pediatria-para-familias/cuidados-com-a-saude/consulta-de-puericultura/

### Tertiary (LOW confidence — proposal only, needs doctor sign-off)
- Common BR pediatric routine lab list (hemograma, EAS, ferritina, glicemia, TSH, perfil lipídico, parasitológico) — a *starting proposal* for the DOC-02 catalog; clinical content requiring human-verify before seeding.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library verified present in `package.json`/`node_modules`; no new installs.
- Architecture: HIGH — pattern read directly from working production code (prescriptions/certificates/templates/migrations).
- Pitfalls: HIGH — IDOR/PDF/admin-client pitfalls are documented in the repo's own CONCERNS.md and reflected in the post-fix code.
- Clinical seed content: LOW (intentionally) — flagged as human-verify; agent must not author.

**Research date:** 2026-07-10
**Valid until:** 2026-08-09 (stable internal pattern; re-check if `@falaped/falaped-kit` bumps past 0.2.7)

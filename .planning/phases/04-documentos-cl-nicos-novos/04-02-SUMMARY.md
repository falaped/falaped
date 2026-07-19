---
phase: 04-documentos-cl-nicos-novos
plan: 02
subsystem: api
tags: [supabase, postgres, rls, storage, pdf, falaped-kit, next, react, zod, tiptap, medical-reports]

# Dependency graph
requires:
  - phase: 04-documentos-cl-nicos-novos
    plan: 01
    provides: "esqueleto-molde (constants bucket, blocos append em actions/index.ts e app-sidebar.tsx, padrão módulo/action/rota/wizard/card/table)"
provides:
  - "Fatia vertical de relatório médico de corpo livre (DOC-03): migration+RLS+storage privado, módulos CRUD/PDF (TipTap→plain→buildMedicalCertificatePdf), action com gate paid, rota top-level, wizard com RichTextEditor, card/table, item na sidebar"
  - "Template de relatório médico salvável/reutilizável per-médico (DOC-04)"
affects: [04-03, 04-04, 04-05, documentos-clinicos, relatorio]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Documento de corpo livre: título/finalidade (Input) + corpo único via RichTextEditor de baixo nível; TipTap HTML → htmlToPlainTextForPdf → buildMedicalCertificatePdf (D-10, Pitfall 4)"
    - "Domínio NOVO medical_reports separado do laudo/report-templates (sem colisão conceitual)"
    - "IDOR anchor: mutação/leitura escopada .eq(id).eq(profile_id); delete spec prova no-op cross-tenant"

key-files:
  created:
    - supabase/migrations/20260710010000_medical_reports.sql
    - supabase/migrations/20260710010100_rls_medical_reports.sql
    - supabase/migrations/20260710010200_storage_medical_reports.sql
    - supabase/migrations/20260710010300_create_medical_report_templates.sql
    - lib/schemas/medical-report.ts
    - modules/medical-reports/*
    - modules/medical-report-templates/*
    - actions/medical-reports/*
    - actions/medical-report-templates/*
    - app/dashboard/medical-reports/*
    - app/api/medical-reports/[id]/download/route.ts
    - components/dashboard/medical-reports/*
  modified:
    - lib/constants.ts
    - actions/index.ts
    - components/app-sidebar.tsx

key-decisions:
  - "Corpo do relatório = RichTextEditor de baixo nível (components/ui/rich-text-editor.tsx), corpo único, NUNCA o report-template-sections-editor do laudo (D-10, Pitfall 4)"
  - "PDF via buildMedicalCertificatePdf (certificateTitle = título em maiúsculas + body = htmlToPlainTextForPdf(bodyHtml)); sem engine de PDF direto e sem builder multi-seção do laudo (D-16)"
  - "Gate paid explícito adicionado à generate + template actions (modelo create-measurement) — NÃO clonado da omissão do generate-prescription"
  - "update-medical-report-pdf-path e delete-medical-report-template endurecidos com .eq(profile_id) (defesa em profundidade, D-15)"
  - "Card/table sem badge de urgência (não aplica ao relatório de corpo livre)"

patterns-established:
  - "Documento clínico de corpo livre = clonar o molde da 04-01 trocando os campos estruturados por título (Input) + corpo (RichTextEditor) e o body-builder por htmlToPlainTextForPdf"

requirements-completed: [DOC-03, DOC-04]

coverage:
  - id: D1
    description: "Migrations de medical_reports (tabela + trigger + índices), RLS (4 policies), storage bucket privado (4 policies) e medical_report_templates (tabela + RLS)"
    requirement: DOC-03
    verification:
      - kind: other
        ref: "ls supabase/migrations/*medical_reports*.sql + *medical_report_templates*.sql (4 arquivos) + greps RLS/foldername"
        status: pass
      - kind: manual_procedural
        ref: "Task 4 checkpoint (BLOCKING): aplicar as 4 migrations ao DB live via Supabase MCP e confirmar tabela+RLS+bucket privado+templates"
        status: unknown
    human_judgment: true
    rationale: "Aplicação real ao banco live (project acstugafrgrqzvtuznxv) pende do orquestrador — typecheck/build passam sem o DB live (tipos vêm do config), então a aplicação precisa de verificação humana/MCP pós-retorno"
  - id: D2
    description: "Módulos CRUD/PDF de medical-reports + medical-report-templates com escopo profile_id (D-15)"
    requirement: DOC-03
    verification:
      - kind: unit
        ref: "modules/medical-reports/delete-medical-report.spec.ts (no-op cross-tenant + storage error engolido)"
        status: pass
      - kind: other
        ref: "yarn tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "generateMedicalReportAction com gate paid + escopo profile_id; PDF via htmlToPlainTextForPdf → buildMedicalCertificatePdf (título + corpo único)"
    requirement: DOC-03
    verification:
      - kind: other
        ref: "grep 'status !== \"paid\"' actions/medical-reports/generate-medical-report.ts + grep htmlToPlainTextForPdf+buildMedicalCertificatePdf modules/medical-reports/generate-medical-report-pdf.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rota /dashboard/medical-reports (list+new), download route owner-scoped 60s, wizard com RichTextEditor de baixo nível + picker reusado, card/table, item na sidebar"
    requirement: DOC-03
    verification:
      - kind: other
        ref: "yarn eslint app/dashboard/medical-reports components/dashboard/medical-reports actions/medical-reports actions/medical-report-templates --max-warnings=0 + grep dashboard/medical-reports app-sidebar.tsx + grep RichTextEditor no wizard"
        status: pass
      - kind: manual_procedural
        ref: "Fluxo manual: gerar relatório (título + corpo rich-text, auto-fill + avulso), PDF sem página em branco extra, salvar/reutilizar template — requer DB live (Task 4)"
        status: unknown
    human_judgment: true
    rationale: "Verificação de comportamento fim-a-fim (geração de PDF sem página em branco extra, download, template) depende das migrations aplicadas ao DB live"
  - id: D5
    description: "Template de relatório médico salvável/reutilizável per-médico (DOC-04)"
    requirement: DOC-04
    verification:
      - kind: other
        ref: "yarn tsc --noEmit (createMedicalReportTemplateAction/deleteMedicalReportTemplateAction + snapshot title/bodyHtml apply no wizard)"
        status: pass
      - kind: manual_procedural
        ref: "Salvar como template e reutilizar em novo relatório — requer DB live (Task 4)"
        status: unknown
    human_judgment: true
    rationale: "Persistência real do template depende das migrations aplicadas ao DB live"

# Metrics
duration: ~30min
completed: 2026-07-19
status: complete
---

# Phase 04 Plan 02: Relatório médico (DOC-03) + Template (DOC-04) Summary

**Fatia vertical de relatório médico de corpo livre: migration+RLS+storage privado, módulos CRUD/PDF que convertem o HTML do TipTap com htmlToPlainTextForPdf e renderizam via buildMedicalCertificatePdf (título + corpo único), action com gate paid + escopo profile_id, rota top-level, wizard usando o RichTextEditor de baixo nível (sem seções, sem report-templates do laudo), card/table e template reutilizável — clonando o molde estabelecido pela 04-01.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3 de 4 (Task 4 = checkpoint BLOCKING de migration-apply, pendente do orquestrador via MCP pós-retorno)
- **Files created/modified:** 40

## Accomplishments
- 4 migrations de medical_reports (tabela+trigger+índices profile_id/issued_at, RLS 4 policies, storage bucket privado `medical-reports` + 4 policies keyed a foldername[1], medical_report_templates+RLS 4 policies)
- Módulos medical-reports (insert/get×3/delete/delete-bulk/upload/update-pdf-path/generate-pdf) + medical-report-templates (create/get×2/delete), todos escopados por profile_id
- generate-medical-report-pdf: `htmlToPlainTextForPdf(bodyHtml)` → `buildMedicalCertificatePdf({ certificateTitle: título, body })` — corpo único, sem engine de PDF direto nem builder multi-seção do laudo (D-16, Pitfall 4)
- generateMedicalReportAction com gate paid explícito + escopo profile_id; template actions (create/delete) idem
- delete-medical-report.spec.ts prova no-op cross-tenant + storage error engolido (D-15), 3/3 passa
- Rota /dashboard/medical-reports (list+loading+new+wrapper+link), download route owner-scoped com signed URL 60s, wizard reusando MedicalCertificatePatientPickerSheet + título (Input) + corpo (RichTextEditor de baixo nível, placeholder "Escreva o relatório…"), card/table (sem badge de urgência), item "Relatórios médicos" na sidebar (Encaminhamentos da 04-01 preservado)

## Task Commits

1. **Task 1: Migrations + constant** - `97539c2` (feat)
2. **Task 2: Módulos medical-reports + templates + schema + delete spec** - `5495eb8` (feat)
3. **Task 3: Actions + rotas + wizard(RichTextEditor)/card/table + sidebar** - `c8b518c` (feat)

**Plan metadata:** (docs commit — este SUMMARY)

## Migration apply order (Task 4 BLOCKING — pendente do orquestrador via MCP pós-retorno)

As 4 migrations foram escritas e commitadas mas **NÃO aplicadas ao DB live** (sem acesso a DB/MCP neste executor). O orquestrador deve aplicá-las via Supabase MCP `apply_migration` nesta ordem:

1. `supabase/migrations/20260710010000_medical_reports.sql` (tabela + trigger + índices)
2. `supabase/migrations/20260710010100_rls_medical_reports.sql` (RLS enable + 4 policies)
3. `supabase/migrations/20260710010200_storage_medical_reports.sql` (bucket privado + 4 storage policies)
4. `supabase/migrations/20260710010300_create_medical_report_templates.sql` (tabela + RLS)

Project Supabase: `acstugafrgrqzvtuznxv`. Timestamps escolhidos posteriores aos da 04-01 (`20260710000000`–`20260710000300`).

## Files Created/Modified
- `supabase/migrations/2026071001*.sql` (4) - tabela medical_reports, RLS, storage privado, medical_report_templates
- `lib/constants.ts` - MEDICAL_REPORTS_BUCKET (append após REFERRALS_BUCKET)
- `lib/schemas/medical-report.ts` - medicalReportPayloadSchema (title min(1), bodyHtml) + generateMedicalReportSchema
- `modules/medical-reports/*` - CRUD, generate-medical-report-pdf (htmlToPlainTextForPdf+buildMedicalCertificatePdf), upload/update-pdf-path, delete spec
- `modules/medical-report-templates/*` - create/get-by-profile/get-by-id-for-profile/delete + types (snapshot title/bodyHtml)
- `actions/medical-reports/*` + `actions/medical-report-templates/*` - actions com gate paid + escopo profile_id; barrels
- `actions/index.ts` - 2 blocos export append (medical-reports, medical-report-templates)
- `app/dashboard/medical-reports/*` - page, loading, new/page, wizard-wrapper, new-medical-report-link
- `app/api/medical-reports/[id]/download/route.ts` - owner-scoped 60s signed URL
- `components/dashboard/medical-reports/*` - medical-report-wizard (RichTextEditor), medical-report-card, medical-report-table
- `components/app-sidebar.tsx` - item Relatórios médicos no grupo Serviços (append)

## Decisions Made
- Corpo do relatório usa `RichTextEditor` de baixo nível (`components/ui/rich-text-editor.tsx`), corpo único; NUNCA o `report-template-sections-editor` do laudo (D-10, Pitfall 4). O HTML do TipTap é convertido por `htmlToPlainTextForPdf` antes do PDF.
- PDF via `buildMedicalCertificatePdf` (certificateTitle = título em maiúsculas + body = texto plano do corpo). Sem `pdfkit` direto, sem `buildReportPdf`, sem import do domínio `report-templates` do laudo.
- Gate paid explícito adicionado às actions generate + template (modelo `create-measurement`), não clonando a omissão do `generate-prescription`.
- `update-medical-report-pdf-path` e `delete-medical-report-template` endurecidos com `.eq("profile_id")` (defesa em profundidade, D-15).
- Card/table sem badge de urgência (não se aplica ao relatório de corpo livre); `isBodyEmpty` guarda o corpo vazio no wizard antes de gerar.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Falso-positivo no grep de verificação `! grep -rq "report-template" components/dashboard/medical-reports`**
- **Found during:** Task 3 (verify command)
- **Issue:** O comando de verificação `! grep -rq "report-template"` falha porque o nome de domínio **mandatado pelo próprio plano** (`medical-report-templates`, arquivos nas linhas 25-29 do PLAN) contém a substring `report-template`. Os dois hits são imports legítimos do meu próprio domínio de templates (`@/modules/medical-report-templates/types` e `.../get-medical-report-templates-by-profile-id`), NÃO do domínio proibido do laudo (`modules/report-templates` / `report-template-sections-editor`).
- **Fix:** Nenhuma mudança de código necessária (não posso renomear `medical-report-templates` — é fixado pelo plano). Verificação substituída pela checagem intent-accurate do Pitfall 4: `grep -rn "report-templates\|report-template-sections" components/dashboard/medical-reports | grep -v "medical-report-templates"` → vazio (nenhuma referência ao domínio proibido do laudo). Confirmado também que o wizard importa e renderiza `RichTextEditor` de baixo nível (corpo único).
- **Files modified:** nenhum (falso-positivo do comando de verificação)
- **Verification:** `grep -rn "modules/report-templates\|report-template-sections\|buildReportPdf\|import pdfkit"` nos diretórios novos → CLEAN; wizard usa `RichTextEditor`; typecheck+eslint limpos.

---

**Total deviations:** 1 auto-fixed (1 falso-positivo de verificação por colisão de substring com o nome de domínio mandatado pelo plano)
**Impact on plan:** Nenhum impacto no código entregue — todas as intenções (D-10, Pitfall 4, D-16) satisfeitas. Sem scope creep.

## Issues Encountered
- Nenhum bloqueio funcional. Task 4 (aplicar migrations ao DB live) é BLOCKING e não pôde ser executada aqui por falta de acesso a DB/MCP — delegada ao orquestrador (aplicada via MCP pós-retorno).

## User Setup Required
**Requer configuração externa (Supabase).** As 4 migrations de medical_reports precisam ser aplicadas ao banco live (project `acstugafrgrqzvtuznxv`) via Supabase MCP `apply_migration`, na ordem: medical_reports → rls_medical_reports → storage_medical_reports → create_medical_report_templates. Sem isso, typecheck/build passam com falso-positivo (tipos vêm do config), mas o fluxo de relatório não funciona no runtime.

## Migration-apply checkpoint status
**Pending orchestrator (applied via MCP post-return).** Task 4 (`checkpoint:human-verify`, gate="blocking") não executada neste executor — sem acesso a DB/MCP. Migrations escritas, commitadas e verificadas estruturalmente; aplicação real e verificação de comportamento fim-a-fim (gerar relatório, PDF sem página em branco extra, salvar/reutilizar template) ficam a cargo do orquestrador.

## Next Phase Readiness
- Molde reforçado (agora com variante de corpo livre via RichTextEditor + htmlToPlainTextForPdf) disponível para as fatias 04-03..04-05.
- Blocker: migration-apply (Task 4) pendente antes de qualquer verificação de comportamento fim-a-fim.

## Self-Check: PASSED

Todos os 12 arquivos-chave verificados no disco e os 3 commits de task (`97539c2`, `5495eb8`, `c8b518c`) presentes no histórico. Suite de verificação do plano (tsc, delete spec 3/3, htmlToPlainTextForPdf+buildMedicalCertificatePdf, sem import proibido de report-templates/pdfkit/buildReportPdf, eslint --max-warnings=0, item na sidebar, gate paid) toda PASS.

---
*Phase: 04-documentos-cl-nicos-novos*
*Completed: 2026-07-19*

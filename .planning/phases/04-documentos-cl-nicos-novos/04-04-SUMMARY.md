---
phase: 04-documentos-cl-nicos-novos
plan: 04
subsystem: guidance
tags: [DOC-06, guidance, orientacoes, puericultura, pdf, rls, idor]
requires: [04-01, 04-02, 04-03]
provides:
  - guidance_templates (biblioteca por-profile, milestone é campo)
  - guidance_documents (documento imprimível + bucket privado)
  - modules/guidance/* (biblioteca CRUD + documento + PDF via kit)
  - actions/guidance/* (generate + biblioteca CRUD + delete document)
  - /dashboard/guidance (page/loading/new + download route)
  - components/dashboard/guidance/* (wizard, milestone-manager, card, table)
  - Item "Orientações" na sidebar (grupo Serviços)
affects:
  - actions/index.ts (append-only)
  - components/app-sidebar.tsx (append-only)
  - lib/constants.ts (append-only)
tech-stack:
  added: []
  patterns:
    - "Biblioteca per-profile com milestone como CAMPO (não tabela por marco) — RESEARCH OQ2"
    - "Documento triple clonado de 04-01 (tabela/rls/storage) com slug guidance_documents"
    - "PDF via buildMedicalCertificatePdf (título ORIENTAÇÕES) — nunca pdfkit/buildReportPdf (D-16)"
    - "IDOR (D-15): .eq(id).eq(profile_id) em toda mutação/leitura; delete spec prova no-op cross-tenant"
key-files:
  created:
    - supabase/migrations/20260710030000_guidance_templates.sql
    - supabase/migrations/20260710030100_seed_guidance_templates.sql
    - supabase/migrations/20260710030200_guidance_documents.sql
    - supabase/migrations/20260710030300_rls_guidance_documents.sql
    - supabase/migrations/20260710030400_storage_guidance_documents.sql
    - lib/schemas/guidance.ts
    - modules/guidance/types.ts
    - modules/guidance/get-guidance-templates-by-profile-id.ts
    - modules/guidance/create-guidance-template.ts
    - modules/guidance/update-guidance-template.ts
    - modules/guidance/delete-guidance-template.ts
    - modules/guidance/insert-guidance-document.ts
    - modules/guidance/get-guidance-documents-by-profile-id.ts
    - modules/guidance/delete-guidance-document.ts
    - modules/guidance/delete-guidance-document.spec.ts
    - modules/guidance/generate-guidance-pdf.ts
    - modules/guidance/upload-guidance-pdf.ts
    - modules/guidance/update-guidance-pdf-path.ts
    - actions/guidance/generate-guidance.ts
    - actions/guidance/create-guidance-template.ts
    - actions/guidance/update-guidance-template.ts
    - actions/guidance/delete-guidance-template.ts
    - actions/guidance/delete-guidance-document.ts
    - actions/guidance/index.ts
    - app/dashboard/guidance/page.tsx
    - app/dashboard/guidance/loading.tsx
    - app/dashboard/guidance/new/page.tsx
    - app/dashboard/guidance/new/guidance-wizard-wrapper.tsx
    - app/api/guidance/[id]/download/route.ts
    - components/dashboard/guidance/guidance-wizard.tsx
    - components/dashboard/guidance/guidance-milestone-manager.tsx
    - components/dashboard/guidance/guidance-document-card.tsx
    - components/dashboard/guidance/guidance-document-table.tsx
  modified:
    - lib/constants.ts
    - actions/index.ts
    - components/app-sidebar.tsx
decisions:
  - "milestone é um CAMPO em guidance_templates (uma tabela), não uma tabela por marco (RESEARCH OQ2 / plano non-negotiable)"
  - "update/delete-guidance-template escopados por profile_id (D-15), mais fortes que o analog prescription-templates (que é id-only)"
  - "Documento de orientação usa buildMedicalCertificatePdf com certificateTitle ORIENTAÇÕES; corpo = 'Marco: <label>' + texto"
metrics:
  duration: "~40min"
  completed: "2026-07-19"
  tasks: 3
  files: 34
status: complete
---

# Phase 4 Plan 4: Biblioteca de Orientações (DOC-06) Summary

Biblioteca de orientações por marco de puericultura (`guidance_templates`, milestone como campo) com seed editável não-vazio aprovado pelo médico, mais o documento imprimível próprio (`guidance_documents`) auto-preenchido com o paciente e gerado em PDF via `buildMedicalCertificatePdf`.

## What Was Built

- **Migrations (5):** `guidance_templates` (biblioteca per-profile, `milestone` campo + RLS 4 policies), `seed_guidance_templates` (10 marcos aprovados, idempotente per-profile), `guidance_documents` (tabela + índices + trigger), `rls_guidance_documents` (RLS 4 policies), `storage_guidance_documents` (bucket privado `guidance` public=false + 4 storage policies foldername[1]). `GUIDANCE_BUCKET` em `lib/constants.ts` (append-only).
- **Módulos:** biblioteca CRUD (`get/create/update/delete-guidance-template`; update/delete escopados por `profile_id` — D-15); documento (`insert/get/delete-guidance-document` + `upload/update-pdf-path`); `generate-guidance-pdf` via kit; `delete-guidance-document.spec.ts` (no-op cross-tenant, storage error engolido). Schema `lib/schemas/guidance.ts` (PT-BR).
- **Actions:** `generate-guidance` (preâmbulo auth + gate `status === "paid"` + `generateGuidanceSchema.safeParse` → `zodErrorToUserMessage`; clamp issuedAt; insert→upload→update-path; filename `orientacao-<yyyy-MM-dd>.pdf`), biblioteca CRUD e delete-document (todas com paid gate + `revalidatePath`). Barrel + append em `actions/index.ts`.
- **UI/Rotas:** `/dashboard/guidance` (biblioteca de marcos + tabela de documentos gerados; empty-state "Nenhuma orientação disponível."/"Revise os textos..." sem CTA), `loading`, `new/page` + wizard-wrapper; `/api/guidance/[id]/download` (owner-scoped, signed URL 60s). `guidance-wizard` (patient picker → auto-fill do cabeçalho com `computePediatricAge`/`formatPediatricAge` → seleção de marco → preview editável → gerar), `guidance-milestone-manager` (editar/adicionar/remover marcos), `guidance-document-card`/`table` (Baixar PDF + delete AlertDialog). Item "Orientações" no grupo Serviços da sidebar (append-only).

## Approved Clinical Seed (checkpoint human-verify)

**Checkpoint de conteúdo clínico: APPROVED** — o médico aprovou EXATAMENTE 10 pares marco→texto (PT-BR). O executor NÃO autorou nenhum texto. O seed contém apenas os 10 textos aprovados, sem alteração, expansão ou invenção:

`1ª consulta`, `1 mês`, `2 meses`, `4 meses`, `6 meses`, `9 meses`, `12 meses`, `18 meses`, `24 meses`, `Anual` (sort_order 0..9), cada um com o corpo editável fornecido. Seed per-profile, idempotente (`where not exists`).

## Migration Apply Order (pending orchestrator — applied via MCP post-return)

O checkpoint de aplicação de migrations é **BLOCKING** e requer acesso ao DB live (indisponível ao executor). Aplicar na ordem:

1. `supabase/migrations/20260710030000_guidance_templates.sql`
2. `supabase/migrations/20260710030100_seed_guidance_templates.sql` (seed aprovado)
3. `supabase/migrations/20260710030200_guidance_documents.sql`
4. `supabase/migrations/20260710030300_rls_guidance_documents.sql`
5. `supabase/migrations/20260710030400_storage_guidance_documents.sql`

Status: **pending orchestrator (applied via MCP post-return)**. Confirmar após apply: tabelas `guidance_templates`/`guidance_documents` com RLS, bucket privado `guidance` (public=false, 4 policies), biblioteca semeada só com os 10 textos aprovados.

## Verification Results

- `yarn tsc --noEmit` — passa (exit 0).
- `yarn eslint app/dashboard/guidance components/dashboard/guidance actions/guidance app/api/guidance --max-warnings=0` — limpo (exit 0). Também limpo em `actions/index.ts`, `lib/constants.ts`, `lib/schemas/guidance.ts`, `modules/guidance`, `components/app-sidebar.tsx`.
- `node --test --import tsx modules/guidance/delete-guidance-document.spec.ts` — 3 tests, 3 pass, 0 fail.
- Sidebar: item "Orientações" presente; entradas de 04-01/02/03 (referrals, medical-reports, exam-requests) preservadas.
- `grep 'status !== "paid"' actions/guidance/generate-guidance.ts` — presente (gate paid).
- Sem imports reais de `pdfkit`/`buildReportPdf` em `modules/guidance/` (só menção em comentário descritivo).

## Deviations from Plan

- **Verify glob de Task 1 (não-bloqueante):** o comando `ls *guidance_templates*.sql *seed_guidance*.sql *guidance_documents*.sql | wc -l -eq 4` conta 6 (globs duplicam `seed_guidance_templates` e casam 3 arquivos `guidance_documents*`). A intenção substantiva (5 arquivos: biblioteca + seed + documento triple, todos com os checks green) foi cumprida; os 5 arquivos existem e todos os greps de conteúdo passam.
- **update/delete-guidance-template com profile scope:** o analog `prescription-templates` é id-only, mas o plano exige `.eq("id").eq("profile_id")` (D-15) para a biblioteca. Aplicado conforme o plano (mais forte que o analog).

## Deferred / Pending

- **Migration-apply checkpoint:** BLOCKING, aplicado pelo orquestrador via Supabase MCP após o retorno (ver ordem acima). Sem o apply, typecheck/build passam com falso-positivo (tabelas não existem no DB live).
- Verificação manual (revisar/editar texto de marco, adicionar marco próprio, gerar orientação → PDF sem página em branco; `curl` sem auth ao bucket falha) fica para pós-apply.

## Known Stubs

None — a biblioteca é semeada com os 10 textos aprovados; nenhum valor placeholder/hardcoded flui para a UI.

## Self-Check: PASSED

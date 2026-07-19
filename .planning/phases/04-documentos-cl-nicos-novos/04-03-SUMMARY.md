---
phase: 04-documentos-cl-nicos-novos
plan: 03
subsystem: api
tags: [supabase, postgres, rls, storage, pdf, falaped-kit, next, react, zod, exam-requests, exam-catalog, exam-panels]

# Dependency graph
requires:
  - phase: 04-documentos-cl-nicos-novos
    plan: 01
    provides: "esqueleto-molde (constants bucket, blocos append em actions/index.ts e app-sidebar.tsx, padrão módulo/action/rota/wizard/card/table)"
  - phase: 04-documentos-cl-nicos-novos
    plan: 02
    provides: "referência mais recente do triple migration + template + delete spec + download route"
provides:
  - "Fatia vertical do pedido de exames (DOC-02): migration+RLS+storage privado, catálogo pesquisável (D-01) + painéis reutilizáveis relacionais per-profile (D-02), wizard com exams[] editável que expande painéis em itens removíveis (D-03), action com gate paid, rota top-level, card/table, item na sidebar"
  - "Template de pedido de exames salvável/reutilizável per-médico (DOC-04)"
  - "Seed de catálogo clínico APROVADO pelo médico (13 exames + 2 painéis default), per-profile, idempotente"
affects: [04-04, 04-05, documentos-clinicos, pedido-exames]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modelo relacional novo per-profile: exam_catalog_items (D-01) + exam_panels (panel_items text[], D-02) com RLS 4-policies profile_id; referência de dados escopada por médico"
    - "Payload auto-contido: armazena strings RESOLVIDAS dos exames (nunca ids de catálogo) — Pitfall 5"
    - "Aplicar painel expande panel_items no array editável exams[] do wizard; cada item removível via Trash2 aria-label Remover exame (D-03)"
    - "Catálogo pesquisável reusa normalize/filter de report-template-search-input; texto livre adiciona item fora do catálogo"
    - "Seed clínico gated por checkpoint human-verify blocking-human ANTES do seed (Pitfall 3); executor não autora conteúdo"
    - "PDF via buildMedicalCertificatePdf (título PEDIDO DE EXAMES); nunca pdfkit/buildReportPdf (D-16)"
    - "IDOR anchor: mutação/leitura escopada .eq(id).eq(profile_id) incl. delete de painel; delete spec prova no-op cross-tenant"

key-files:
  created:
    - supabase/migrations/20260710020000_exam_requests.sql
    - supabase/migrations/20260710020100_rls_exam_requests.sql
    - supabase/migrations/20260710020200_storage_exam_requests.sql
    - supabase/migrations/20260710020300_create_exam_request_templates.sql
    - supabase/migrations/20260710020400_exam_catalog_items.sql
    - supabase/migrations/20260710020500_exam_panels.sql
    - supabase/migrations/20260710020600_seed_exam_catalog.sql
    - lib/schemas/exam-request.ts
    - modules/exam-requests/*
    - modules/exam-catalog/*
    - modules/exam-panels/*
    - modules/exam-request-templates/*
    - actions/exam-requests/*
    - actions/exam-panels/*
    - actions/exam-request-templates/*
    - app/dashboard/exam-requests/*
    - app/api/exam-requests/[id]/download/route.ts
    - components/dashboard/exam-requests/*
  modified:
    - lib/constants.ts
    - actions/index.ts
    - components/app-sidebar.tsx

decisions:
  - "Catálogo e painéis são per-profile (RESEARCH OQ1 default per-profile) — cada médico tem sua própria referência escopada por profile_id + RLS"
  - "Seed per-profile via insert ... select ... from public.profiles, idempotente com where not exists (não duplica em re-run)"
  - "Template delete endurecido com .eq(profile_id) (defense-in-depth), além do gate get-...-for-profile"
  - "exam-request-table sem coluna de urgência (diferente do encaminhamento) — só Data + Paciente + Ações"

metrics:
  duration: "~1 sessão"
  completed: 2026-07-19
  tasks: 3
  files_created: 40
  files_modified: 3

status: complete
---

# Phase 4 Plan 3: Pedido de Exames (DOC-02) + Template (DOC-04) Summary

Fatia vertical do pedido de exames pediátrico com modelo relacional novo (catálogo pesquisável + painéis reutilizáveis), payload auto-contido de strings resolvidas, PDF via `buildMedicalCertificatePdf` (título "PEDIDO DE EXAMES") e template salvável — semeado exclusivamente com o conteúdo clínico aprovado pelo médico.

## What Was Built

**Task 1 — Migrations + seed aprovado + constant** (`22c2fce`)
- 7 migrations: triple `exam_requests` (tabela/RLS/storage privado) + `exam_request_templates` + as duas tabelas relacionais `exam_catalog_items` e `exam_panels` (per-profile, RLS 4-policies, `panel_items text[]`) + `seed_exam_catalog`.
- `EXAM_REQUESTS_BUCKET` em `lib/constants.ts` (append-only).

**Task 2 — Módulos + schema + delete spec** (`6077e74`)
- `modules/exam-requests/*` (insert / get x3 / delete / bulk / upload / update-path / body-segments / generate-pdf), IDOR-scoped, PDF via `buildMedicalCertificatePdf`.
- `modules/exam-catalog/*`, `modules/exam-panels/*` (delete escopado por profile_id), `modules/exam-request-templates/*`.
- `lib/schemas/exam-request.ts` — `exams: string[]` resolvidas (Pitfall 5).
- `delete-exam-request.spec.ts` — 3/3 passam (no-op cross-tenant + storage-error-swallow).

**Task 3 — Actions, rotas, wizard, card/table, sidebar** (`b538630`)
- Actions com gate paid (D-15) para generate/delete/bulk + painéis + templates; 3 barrels append em `actions/index.ts`.
- Rotas page/loading/new + download route owner-scoped (signed URL 60s, gate paid).
- `exam-catalog-search.tsx` (normalize/filter + texto livre), `exam-request-wizard.tsx` (exams[] editável, aplicar painel expande em itens removíveis via Trash2 `aria-label="Remover exame"`, salvar painel/template), card/table.
- Item "Pedidos de exames" na sidebar (append; 04-01/04-02 preservados).

## Seed de conteúdo clínico (checkpoint APROVADO)

O checkpoint human-verify de conteúdo clínico foi **APROVADO pelo médico** antes do seed. O `seed_exam_catalog.sql` contém EXCLUSIVAMENTE o conteúdo aprovado, nada inventado:

- **Catálogo (13 exames):** Hemograma completo, EAS (urina tipo I), Urocultura, Parasitológico de fezes (EPF), Glicemia de jejum, Ferritina, TSH, T4 livre, Perfil lipídico, Vitamina D (25-OH), TGO/TGP, Ureia e creatinina, PCR.
- **Painéis default (2):**
  - "Rotina lactente" → Hemograma completo, Ferritina, EAS (urina tipo I), Parasitológico de fezes (EPF)
  - "Triagem escolar" → Hemograma completo, Glicemia de jejum, Perfil lipídico, TSH
- Mecanismo: `insert ... select ... from public.profiles` (per-profile), idempotente com `where not exists`.

## Verification

- `yarn tsc --noEmit` — limpo.
- `yarn eslint app/dashboard/exam-requests components/dashboard/exam-requests actions/exam-requests actions/exam-panels actions/exam-request-templates --max-warnings=0` — limpo.
- `node --test --import tsx modules/exam-requests/delete-exam-request.spec.ts` — 3 tests, 3 pass, 0 fail.
- Greps: sidebar `dashboard/exam-requests` OK, `status !== "paid"` OK, `Remover exame` OK, `buildMedicalCertificatePdf` OK, delete de painel escopado por `profile_id` OK.
- Anti-padrões `pdfkit`/`buildReportPdf` — ausentes em modules/actions/components de exam-requests.

## Deviations from Plan

Nenhuma. Ajuste menor (não é desvio de escopo): `exam-request-wizard.tsx` foi escrito sem os imports de `Select` (os painéis usam Sheet picker, não Select) — os imports não usados foram removidos para passar no eslint `--max-warnings=0`.

## Checkpoints

- **Checkpoint de conteúdo clínico (catálogo + painéis):** APROVADO pelo médico. Seed contém apenas os 13 exames + 2 painéis aprovados.
- **Checkpoint de aplicação de migrations ao banco live (BLOCKING):** PENDING orchestrator (aplicado via MCP pós-retorno). O executor não tem acesso ao banco live; typecheck/eslint/spec passam sem o DB. As 7 migrations devem ser aplicadas na ordem abaixo.

### Ordem de aplicação das 7 migrations (pendente orchestrator via Supabase MCP)

1. `supabase/migrations/20260710020000_exam_requests.sql`
2. `supabase/migrations/20260710020100_rls_exam_requests.sql`
3. `supabase/migrations/20260710020200_storage_exam_requests.sql`
4. `supabase/migrations/20260710020300_create_exam_request_templates.sql`
5. `supabase/migrations/20260710020400_exam_catalog_items.sql`
6. `supabase/migrations/20260710020500_exam_panels.sql`
7. `supabase/migrations/20260710020600_seed_exam_catalog.sql` (seed aprovado)

## Known Stubs

Nenhum. O card standalone (`exam-request-card.tsx`) é o molde clonado do `referral-card.tsx` (mesmo padrão do 04-01/04-02, exportado para uso futuro/entrada por perfil) — não é stub de dados.

## Self-Check: PASSED

Todos os arquivos criados verificados em disco; commits `22c2fce`, `6077e74`, `b538630` presentes no histórico.

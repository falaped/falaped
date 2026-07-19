---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 03
current_phase_name: curva-de-crescimento
status: merged
stopped_at: 04-04 code complete
last_updated: "2026-07-19T17:45:56.601Z"
last_activity: 2026-07-09
last_activity_desc: Phase 03 all plans complete; migration live; verification done
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 17
  completed_plans: 17
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-27)

**Core value:** A consulta pediátrica flui sem fricção — abrir o paciente, conduzir a consulta e gerar os documentos certos (impressos corretamente) em poucos cliques.
**Current focus:** Phase 03 — curva-de-crescimento

## Current Position

Phase: 03 (curva-de-crescimento) — VERIFYING
Plan: 4 of 4 (all executed)
Status: Code verified (PASSED-WITH-CONCERNS); 2 manual checkpoints + UAT pending before ship
Last activity: 2026-07-09 — Phase 03 all plans complete; migration live; verification done

Progress: [██████████] 100% (plans executed)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P02 | 10min | 1 tasks | 4 files |
| Phase 02 P01 | 10min | 3 tasks | 10 files |
| Phase 02 P02 | 20min | 6 tasks | 24 files |
| Phase 03 P01 | 20min | 4 tasks | 16 files |
| Phase 03 P03 | 6 | 2 tasks | 14 files |
| Phase 04 P01 | 35min | 3 tasks | 39 files |
| Phase 04 P02 | ~30min | 3 tasks | 40 files |
| Phase 04 P04 | 40min | 3 tasks | 34 files |
| Phase 04 P05 | 15min | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap 2026-07-09]: Inserida Phase 3 "Curva de Crescimento" (GROWTH-01..03); renumeração inteira: Documentos → Phase 4, Calendário de Vacinas → Phase 5, Carteira de Vacinação → Phase 6
- [Roadmap]: Motor de idade (`computePediatricAge`) é a keystone — fica na Phase 1 e é consumido pela curva de crescimento (Phase 3) e pela lógica de vacina (Phase 6)
- [Roadmap]: Correção de PDF (CONS-04) precede os documentos novos (Phase 4), que herdam o builder `@falaped/falaped-kit/pdf`
- [Roadmap]: Vacinas separadas em referência (dado estático, Phase 5) vs carteira por paciente (tabela owned, Phase 6)
- [Roadmap]: Foto da criança em bucket privado + URL assinada — NÃO reusar o bucket público de logos (LGPD)
- [Phase ?]: Pediatric age band boundary at 24 months (a 1-year-old reads '12 meses'); months/days via differenceInMonths + intervalToDuration remainder; corrected age by shifting birth date forward and re-banding, capped at 24 months corrected.
- [Phase ?]: [Phase 2] Foto da criança em bucket privado patient-photos (public=false) + 4 storage RLS owner-scoped via foldername[1] — aplicado ao DB live (D-01/D-03)
- [Phase ?]: [Phase 2] Armazenar o path do objeto (profile_id/patient_id.ext), nunca a URL; consentimento server-side via z.literal(true) + colunas consent_given/consent_at (D-02/D-04/D-05)
- [Phase 2]: Compressão client-side via browser-image-compression@2.0.2 (Free plan sem transforms nativas — D-09); upload upsert = foto única substituível (D-08); input clássico sem capture (D-07)
- [Phase 2]: Helper singular (TTL 60s) alimenta hero + cabeçalho do caso; helper de lote (createSignedUrls) alimenta a lista (TTL 300s, sem N+1); <AvatarImage> Radix em todas as superfícies, nunca next/image (D-10/D-11)
- [Phase ?]: 03-03: toda mutação em patient_measurements escopa por id+profile_id+patient_id (nunca só id) — guarda IDOR (D-14 / CONCERNS Pitfall 5)
- [Phase ?]: 03-03: measurement-form reusado em modo edit; history-table virou client component p/ Editar/Remover por linha
- [Phase ?]: 04-01: Novo documento clínico = clonar prescriptions (módulos/action/rota/card/table) + medical-certificates (PDF título+corpo via buildMedicalCertificatePdf) + prescription-templates (snapshot)
- [Phase ?]: 04-01: urgency guardada no payload jsonb (Discretion-A); badge semântico derivado no table; update-pdf-path e template delete endurecidos com .eq(profile_id)
- [Phase 04]: Corpo do relatório via RichTextEditor de baixo nível (corpo único), TipTap HTML → htmlToPlainTextForPdf → buildMedicalCertificatePdf; domínio medical_reports novo e separado do laudo (D-10, Pitfall 4)
- [Phase ?]: 04-04: milestone é um CAMPO em guidance_templates (uma tabela), não tabela por marco (RESEARCH OQ2)
- [Phase ?]: 04-04: update/delete-guidance-template escopados por profile_id (D-15), mais fortes que o analog prescription-templates

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

- [Phase 3 / PR #3 code review — deferred 2026-07-09] 10 findings in `.planning/phases/03-curva-de-crescimento/03-CODE-REVIEW.md`. Priority fixes before/after merge: #1 cross-tenant `patient_id` not verified on create/update (IDOR), #2 corrected-age axis silently falls back to chronological past 36m (clinical mis-scoring), #3 partial edit wipes cleared fields to null (data loss), #4 P97/P3 boundary mislabel, #5 unhandled rejection in delete dialog. #6–#10 are defense-in-depth/cleanup.

### Blockers/Concerns

[Issues that affect future work]

- [Phase 2] Confirmar plano Supabase (Pro?) antes de construir foto — decide transform-on-the-fly vs `browser-image-compression` no cliente; confirmar requisitos de consentimento/exclusão
- [Phase 5] Acurácia dos dados PNI/SBIm deve ser verificada com o médico contra as fontes oficiais atuais no momento do build (tarefa de conteúdo, não de stack)
- [Phase 3] Acurácia das curvas de referência OMS (percentis/z-score) é tarefa de conteúdo — verificar dados/fonte oficiais no momento do build; decidir peso/idade, estatura/idade, IMC/idade, PC/idade e faixas etárias cobertas
- [Phase 1] Correção de PDF cruza dois repos (kit + app) e pode exigir bump coordenado do `@falaped/falaped-kit` (>=0.2.7)
- [Cross-cutting] App não tem RLS de tabela — todo slice novo precisa filtro `profile_id` em read/write/delete + gate `paid` + teste de ownership (Pitfall 5)
- [Phase 2 — anomalia 02-03 RESOLVIDA 2026-06-29] O 02-03 (PHOTO-03) ficou commitado sem SUMMARY/verificação (mark-and-skip). Fechado via close-out manual: 02-03-SUMMARY.md reconstruído + VERIFICATION.md canônica gerada (status: passed, 11/11 must-haves). UAT 10/10 (02-UAT.md). Phase 02 agora 3/3 summaries, verificação passed, predicado de conclusão = true. ÚLTIMO gate antes do ship: SECURITY.md (security_enforcement=true) → rodar `/gsd-secure-phase 02`, depois `/gsd-ship 02`.
- 04-01 Task 4 (BLOCKING): aplicar as 4 migrations de referrals ao DB live acstugafrgrqzvtuznxv via Supabase MCP (ordem: referrals, rls_referrals, storage_referrals, create_referral_templates)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260629-egq | Corrigir 3 pontos da foto do paciente (avatar persiste no refresh; foto na lista; upload em modal) | 2026-06-29 | 87468f8 | [260629-egq-corrigir-3-pontos-da-foto-do-paciente-1-](./quick/260629-egq-corrigir-3-pontos-da-foto-do-paciente-1-/) |
| 260701-ctf | Corrigir erro "Invalid input: expected string, received number" no campo idade gestacional ao criar/editar paciente (double-parse) | 2026-07-09 | beb8ce7 (PR #2) | [260701-ctf-fix-gestational-age-double-parse](./quick/260701-ctf-fix-gestational-age-double-parse/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-19T17:45:47.886Z
Stopped at: 04-04 code complete
Resume file: None
Resume file: .planning/phases/03-curva-de-crescimento/03-UI-SPEC.md

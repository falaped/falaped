---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02
current_phase_name: foto-privada-do-paciente
status: "Phase 02 shipped — PR #1"
stopped_at: "Fase 3 discuss em andamento — 4 áreas escolhidas; pendente: 1ª pergunta DOC-02 (fonte do catálogo de exames), usuário quer esclarecer antes de responder. Sem CONTEXT.md ainda."
last_updated: "2026-06-30T11:57:26.305Z"
last_activity: 2026-06-29
last_activity_desc: "Shipped milestone v1.0 (Fases 01+02) — PR #1"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-27)

**Core value:** A consulta pediátrica flui sem fricção — abrir o paciente, conduzir a consulta e gerar os documentos certos (impressos corretamente) em poucos cliques.
**Current focus:** Phase 02 — foto-privada-do-paciente

## Current Position

Phase: 02 (foto-privada-do-paciente) — EXECUTING (02-03 anomaly, see Blockers)
Plan: 3 of 3
Status: Phase 02 shipped — PR #1
Last activity: 2026-06-29 -- Shipped milestone v1.0 (Fases 01+02) — PR #1

Progress: [██████░░░░] 60%

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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Motor de idade (`computePediatricAge`) é a keystone — fica na Phase 1 e é consumido também pela lógica de vacina (Phase 5)
- [Roadmap]: Correção de PDF (CONS-04) precede os documentos novos (Phase 3), que herdam o builder `@falaped/falaped-kit/pdf`
- [Roadmap]: Vacinas separadas em referência (dado estático, Phase 4) vs carteira por paciente (tabela owned, Phase 5)
- [Roadmap]: Foto da criança em bucket privado + URL assinada — NÃO reusar o bucket público de logos (LGPD)
- [Phase ?]: Pediatric age band boundary at 24 months (a 1-year-old reads '12 meses'); months/days via differenceInMonths + intervalToDuration remainder; corrected age by shifting birth date forward and re-banding, capped at 24 months corrected.
- [Phase ?]: [Phase 2] Foto da criança em bucket privado patient-photos (public=false) + 4 storage RLS owner-scoped via foldername[1] — aplicado ao DB live (D-01/D-03)
- [Phase ?]: [Phase 2] Armazenar o path do objeto (profile_id/patient_id.ext), nunca a URL; consentimento server-side via z.literal(true) + colunas consent_given/consent_at (D-02/D-04/D-05)
- [Phase 2]: Compressão client-side via browser-image-compression@2.0.2 (Free plan sem transforms nativas — D-09); upload upsert = foto única substituível (D-08); input clássico sem capture (D-07)
- [Phase 2]: Helper singular (TTL 60s) alimenta hero + cabeçalho do caso; helper de lote (createSignedUrls) alimenta a lista (TTL 300s, sem N+1); <AvatarImage> Radix em todas as superfícies, nunca next/image (D-10/D-11)

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- [Phase 2] Confirmar plano Supabase (Pro?) antes de construir foto — decide transform-on-the-fly vs `browser-image-compression` no cliente; confirmar requisitos de consentimento/exclusão
- [Phase 4] Acurácia dos dados PNI/SBIm deve ser verificada com o médico contra as fontes oficiais atuais no momento do build (tarefa de conteúdo, não de stack)
- [Phase 1] Correção de PDF cruza dois repos (kit + app) e pode exigir bump coordenado do `@falaped/falaped-kit` (>=0.2.7)
- [Cross-cutting] App não tem RLS de tabela — todo slice novo precisa filtro `profile_id` em read/write/delete + gate `paid` + teste de ownership (Pitfall 5)
- [Phase 2 — anomalia 02-03 RESOLVIDA 2026-06-29] O 02-03 (PHOTO-03) ficou commitado sem SUMMARY/verificação (mark-and-skip). Fechado via close-out manual: 02-03-SUMMARY.md reconstruído + VERIFICATION.md canônica gerada (status: passed, 11/11 must-haves). UAT 10/10 (02-UAT.md). Phase 02 agora 3/3 summaries, verificação passed, predicado de conclusão = true. ÚLTIMO gate antes do ship: SECURITY.md (security_enforcement=true) → rodar `/gsd-secure-phase 02`, depois `/gsd-ship 02`.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260629-egq | Corrigir 3 pontos da foto do paciente (avatar persiste no refresh; foto na lista; upload em modal) | 2026-06-29 | 87468f8 | [260629-egq-corrigir-3-pontos-da-foto-do-paciente-1-](./quick/260629-egq-corrigir-3-pontos-da-foto-do-paciente-1-/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-06-30T11:57:26.300Z
Stopped at: Fase 3 discuss em andamento — 4 áreas escolhidas; pendente: 1ª pergunta DOC-02 (fonte do catálogo de exames), usuário quer esclarecer antes de responder. Sem CONTEXT.md ainda.
Resume file: .planning/ROADMAP.md

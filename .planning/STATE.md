---
gsd_state_version: '1.0'  # placeholder; syncStateFrontmatter overwrites on first state.* call
status: planning
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-27)

**Core value:** A consulta pediátrica flui sem fricção — abrir o paciente, conduzir a consulta e gerar os documentos certos (impressos corretamente) em poucos cliques.
**Current focus:** Phase 1 — Experiência da Consulta

## Current Position

Phase: 1 of 5 (Experiência da Consulta)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-06-28 — Roadmap criado (5 fases coarse, 20/20 requisitos mapeados)

Progress: [░░░░░░░░░░] 0%

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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Motor de idade (`computePediatricAge`) é a keystone — fica na Phase 1 e é consumido também pela lógica de vacina (Phase 5)
- [Roadmap]: Correção de PDF (CONS-04) precede os documentos novos (Phase 3), que herdam o builder `@falaped/falaped-kit/pdf`
- [Roadmap]: Vacinas separadas em referência (dado estático, Phase 4) vs carteira por paciente (tabela owned, Phase 5)
- [Roadmap]: Foto da criança em bucket privado + URL assinada — NÃO reusar o bucket público de logos (LGPD)

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- [Phase 2] Confirmar plano Supabase (Pro?) antes de construir foto — decide transform-on-the-fly vs `browser-image-compression` no cliente; confirmar requisitos de consentimento/exclusão
- [Phase 4] Acurácia dos dados PNI/SBIm deve ser verificada com o médico contra as fontes oficiais atuais no momento do build (tarefa de conteúdo, não de stack)
- [Phase 1] Correção de PDF cruza dois repos (kit + app) e pode exigir bump coordenado do `@falaped/falaped-kit` (>=0.2.7)
- [Cross-cutting] App não tem RLS de tabela — todo slice novo precisa filtro `profile_id` em read/write/delete + gate `paid` + teste de ownership (Pitfall 5)

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-06-28
Stopped at: ROADMAP.md e STATE.md criados; traceability do REQUIREMENTS.md atualizada
Resume file: None

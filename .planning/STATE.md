---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Agenda & Ganhos
current_phase: 07
current_phase_name: consultas-ciclo-de-status
status: executing
stopped_at: Phase 7 UI-SPEC approved
last_updated: "2026-07-23T03:08:38.601Z"
last_activity: 2026-07-23
last_activity_desc: Phase 07 execution started
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 6
  completed_plans: 4
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-20)

**Core value:** A consulta pediátrica flui sem fricção — abrir o paciente, conduzir a consulta e gerar os documentos certos (impressos corretamente) em poucos cliques.
**Current focus:** Phase 07 — consultas-ciclo-de-status

## Current Position

Phase: 07 (consultas-ciclo-de-status) — EXECUTING
Plan: 2 of 3
Status: Ready to execute
Last activity: 2026-07-23 — Phase 07 execution started

## Roadmap (milestone v1.1)

| Phase | Nome | Requisitos | Nota |
|-------|------|------------|------|
| 6 | Disponibilidade & Calendário do Médico | AGENDA-01..04 | primeira; zero nova superfície de ataque; regras+exceções, expand-slots puro |
| 7 | Consultas & Ciclo de Status | APPT-01..04 | exclusion constraint btree_gist (pendente+confirmada segura o horário) |
| 8 | Assentos & Convite — Fundação de Acesso Delegado | SEAT-01, SEAT-05 | **FUNDAÇÃO DE SEGURANÇA** — membership + convite/aceite sobre Supabase Auth + enforcement de escopo (RLS + verificação nas actions); construir/testar cross-tenant E cross-scope em isolamento, UI mínima; flag de security review |
| 9 | UI de Agendamento da Assistente | SEAT-02, SEAT-03, SEAT-04 | UI sobre a SESSÃO AUTENTICADA do assento (não link) — provada na Phase 8 |
| 10 | Livro-caixa de Ganhos & Painel | EARN-01..05 | ortogonal; depende só da FK de consulta (Phase 7) |

## Performance Metrics

**Velocity:**

- Total plans completed: 3 (milestone v1.0, arquivado)
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 06 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 06 P02 | 8 | 2 tasks | 5 files |
| Phase 06 P03 | 389 | 3 tasks | 10 files |
| Phase 06 P01 | 4 min | 4 tasks | 5 files |
| Phase 06 P02 | ~3min | 2 tasks | 7 files |
| Phase 06 P03 | ~2h | 3 tasks | 9 files |
| Phase 07 P01 | 2min | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work (milestone v1.1):

- [Roadmap v1.1 2026-07-20]: Fases continuam a partir do v1.0 (última fase 5); milestone v1.1 começa na Phase 6, sem reset para 1
- [Roadmap v1.1]: Ordem dirigida por dependência — Disponibilidade (6) → Consultas+exclusion constraint (7) → Assentos/fundação de acesso delegado testada em isolamento (8) → UI da assistente sobre a sessão autenticada provada (9) → Ganhos (10, ortogonal, depende só da FK da 7)
- [Decisão travada v1.1 — SEGURANÇA]: Acesso da assistente = **assento leve por membership** (login real + RLS/escopo), NÃO link/token session-less. Identidade nominal é mais segura/auditável sobre base de menores (LGPD); evita a 1ª superfície não autenticada do app. Proposta de token superada. Path C (org completa, refatorar profile_id→org_id) descartado para este ciclo
- [Roadmap v1.1]: Phase 8 (assentos) construída e testada cross-tenant E cross-scope com UI mínima antes da Phase 9; o risco central agora é vazamento de ESCOPO do membership (não link vazável) — flag de security review obrigatório
- [Decisão travada v1.1]: Pendente SEGURA o horário — exclusion constraint cobre status em pending+confirmed (Phase 7)
- [Decisão travada v1.1]: Média de ganhos = total ÷ TODOS os lançamentos do período (avulsos incluídos no denominador), arredondamento único (Phase 10)
- [Decisão travada v1.1]: Painel-only, SEM notificações neste ciclo
- [Decisão travada v1.1]: Fuso fixo único da clínica (America/Sao_Paulo) para expansão de slots (Phase 6) e buckets de ganhos (Phase 10)

<!-- Decisões do v1.0 arquivadas com o milestone. -->

- [Phase ?]: Agenda: navegação Dia/Semana/Mês re-agrupa client-side os slots já expandidos da semana atual + byDay para o mês.
- [Phase ?]: [Phase 06-01] Migração híbrida ALTER-only aplicada ao DB vivo — rows v1 preservadas e backfilled para override_type='subtract' (D-20/D-22); RLS + 4 policies intactas
- [Phase ?]: [Phase 06-01] expandAvailability v2: precedência híbrida D-21 (folga vence) + wall-clock DST-safe (WR-01); schema Zod endurecido (ISO estrita WR-02, teto 1440 WR-03)
- [Phase ?]: [Phase 06-03] Calendário único editável entregue; interação D-15/D-16 (toggle+click/drag) supersedida com aprovação do usuário por menu de contexto cursor-anchored (esq=disponibilidade, dir=folga), toolbar slim no topo, janela 06-18 dias úteis, folga cinza-claro, batch save + guarda de descarte, botões limpar por view
- [Phase 07-01]: Fundacao DB de appointments viva: enum appointment_status (5 valores), tabela owner-scoped + RLS/4 policies, btree_gist, exclusion constraint parcial (pending+confirmed segura o horario, 23P01), patient_id ON DELETE RESTRICT; maquina de transicoes pura + schemas Zod

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

- [Cross-cutting v1.1] RLS é AGORA a norma (toda migration pós-2026-06-04) — as tabelas novas (availability_rules, availability_exceptions, appointments, financial_entries, memberships) devem habilitar RLS + políticas na mesma migration, MAIS filtro `.eq(profile_id)` em código (defense-in-depth)
- [Phase 8] O desenho de membership + RLS precisa de pesquisa no plan-phase: como as políticas RLS por membership coexistem com as políticas `profile_id`-do-dono já existentes; **column-scoping** do paciente (RLS é row-level → expor só campos mínimos exige action mediada que faz SELECT allow-listado, não read direto pelo assento)
- [Phase 8] Open questions a resolver no discuss: fluxo de convite/aceite (e-mail → conta → membership); comportamento do assento quando a assinatura do médico dono expira (paid) — decidir se o acesso delegado depende do dono estar paid

### Blockers/Concerns

[Issues that affect future work]

- [Cross-cutting] Todo slice novo precisa filtro `profile_id` em read/write/delete + gate `paid` + teste de ownership (Pitfall 17); o assento usa sessão autenticada normal (não pula auth), mas seu escopo é enforced por membership ativo + RLS, nunca só por convenção de código
- [Phase 8] Risco central = vazamento de ESCOPO do membership: uma política RLS frouxa ou uma action sem verificação de membership expõe prontuário/outro médico. Verificar com testes cross-tenant (médico X ≠ médico Y) E cross-scope (assento não alcança tabela clínica alguma) antes de expor a UI (Phase 9). Reads clínicos diretos (PostgREST) do assento devem ser negados por RLS
- [Phase 7] `btree_gist` exclusion constraint precisa da extensão criada na migration; violação (23P01) deve virar result union amigável, nunca erro cru

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260629-egq | Corrigir 3 pontos da foto do paciente (avatar persiste no refresh; foto na lista; upload em modal) | 2026-06-29 | 87468f8 | [260629-egq-corrigir-3-pontos-da-foto-do-paciente-1-](./quick/260629-egq-corrigir-3-pontos-da-foto-do-paciente-1-/) |
| 260701-ctf | Corrigir erro "Invalid input: expected string, received number" no campo idade gestacional ao criar/editar paciente (double-parse) | 2026-07-09 | beb8ce7 (PR #2) | [260701-ctf-fix-gestational-age-double-parse](./quick/260701-ctf-fix-gestational-age-double-parse/) |
| 260720-qsj | Redesenho das faixas etárias do calendário vacinal (faixas canônicas fixas + regra "faixa anterior") e correção da idade em meses (calendário, não dias/30.4375; cronológica para posição de vacina) | 2026-07-20 | 405282e | [260720-qsj-redesenhar-o-posicionamento-por-idade-do](./quick/260720-qsj-redesenhar-o-posicionamento-por-idade-do/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Foto | Exclusão de foto + verificação de segurança (`02-03`, PHOTO-03) | Deferred | v1.0 close |
| Crescimento | Curva de crescimento do prematuro Intergrowth-21st (`03-04`) | Deferred | v1.0 close |
| Vacinas | Carteira de vacinação por paciente (registrar aplicadas, pendentes/atrasadas por idade) | Deferred | v1.0 close |
| Acesso delegado | Modelo de organização completo (profile_id → org_id em todo o app, papéis) — path C | Deferred | v1.1 roadmap |

## Session Continuity

Last session: 2026-07-23T03:08:10.284Z
Stopped at: Phase 7 UI-SPEC approved
Resume file: .planning/phases/07-consultas-ciclo-de-status/07-UI-SPEC.md
Next: executar 06-02-PLAN.md (expandAvailability puro + suite .spec)

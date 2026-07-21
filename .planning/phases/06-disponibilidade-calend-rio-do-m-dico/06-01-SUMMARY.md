---
phase: 06-disponibilidade-calend-rio-do-m-dico
plan: 01
subsystem: database
tags: [availability, calendar, supabase, rls, migration, zod, postgres]

# Dependency graph
requires:
  - phase: 05 (v1.0, arquivado)
    provides: padrão de migration owner-scoped com RLS + 4 policies (template patient_vaccine_doses) e convenção de módulos CRUD por profile_id
provides:
  - Tabela public.availability_rules (regras semanais, múltiplas faixas/dia, slot_minutes por faixa) com RLS + 4 policies owner-scoped
  - Tabela public.availability_exceptions (folgas subtrativas dia-inteiro ou parcial) com RLS + 4 policies owner-scoped
  - 5 módulos CRUD escopados por profile_id (list/upsert rules, list/create/delete exceptions)
  - Tipos snake_case (AvailabilityRuleRow, AvailabilityExceptionRow) e schema Zod de validação
affects: [06-02 (expandAvailability puro consome as regras), 06-03 (actions + UI da agenda), 07 (appointments escreve por cima — forward constraint)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration owner-scoped: table → enable RLS → 4 policies (select/insert/update/delete) na MESMA migration, todas por profile_id in (select id from public.profiles where auth_user_id = auth.uid())"
    - "Defense-in-depth: RLS no DB + .eq('profile_id', profileId) em todo módulo de leitura/escrita/delete"
    - "upsert de grade inteira: delete-then-insert escopado por profile_id, profile_id sempre carimbado server-side"

key-files:
  created:
    - supabase/migrations/20260721000100_availability_rules.sql
    - supabase/migrations/20260721000200_availability_exceptions.sql
    - modules/availability/types.ts
    - modules/availability/list-availability-rules.ts
    - modules/availability/upsert-availability-rules.ts
    - modules/availability/list-availability-exceptions.ts
    - modules/availability/create-availability-exception.ts
    - modules/availability/delete-availability-exception.ts
    - lib/schemas/availability.ts
  modified: []

key-decisions:
  - "D-02: sem constraint unique em (profile_id, weekday) — permite múltiplas faixas por dia da semana"
  - "D-09: slot_minutes por faixa (não global) — cada regra carrega sua própria granularidade de slot"
  - "D-04: exceção com CHECK (start_minute is null) = (end_minute is null) — folga é dia-inteiro (ambos null) ou parcial (ambos preenchidos)"
  - "D-05: exceções são só subtrativas; sem coluna additive/type nem FK de consulta (forward constraint Phase 7)"
  - "D-13: RLS + todas as 4 policies na mesma migration para evitar negação silenciosa (RLS sem policy)"
  - "weekday 0=domingo..6=sábado, casando com date-fns getDay(), documentado em comment on column"

patterns-established:
  - "Domínio availability em modules/availability/ segue molde patient-vaccine-doses (uma fn por arquivo, SupabaseClient injetado, throw [AVAILABILITY])"
  - "CHECK constraints de horário no DB: múltiplos de 30, end > start, weekday 0..6, slot_minutes > 0"

requirements-completed: [AGENDA-01, AGENDA-03]

coverage:
  - id: D1
    description: "Tabelas availability_rules e availability_exceptions no banco com RLS habilitada + 4 policies owner-scoped por profile_id"
    requirement: "AGENDA-01"
    verification:
      - kind: manual_procedural
        ref: "mcp__supabase list_tables + get_advisors (security) — tabelas existem, rls_enabled=true, 4 policies cada, sem aviso RLS-sem-policy"
        status: pass
    human_judgment: false
  - id: D2
    description: "5 módulos CRUD escopados por profile_id + tipos snake_case + schema Zod prontos para os actions do Plano 03"
    requirement: "AGENDA-03"
    verification:
      - kind: unit
        ref: "yarn typecheck (tsc --noEmit) — Done, sem erros"
        status: pass
      - kind: manual_procedural
        ref: "grep .eq('profile_id') presente em cada módulo; grep next/cache|next/headers em modules/availability = 0"
        status: pass
    human_judgment: false

# Metrics
duration: ~2min (continuation) + ~62min (waves 1-2)
completed: 2026-07-21
status: complete
---

# Phase 6 Plan 01: Fundação de persistência da disponibilidade Summary

**Duas tabelas Postgres owner-scoped (availability_rules com múltiplas faixas/dia + slot por faixa; availability_exceptions subtrativas) com RLS + 4 policies cada, 5 módulos CRUD escopados por profile_id e schema Zod — migrations aplicadas e verificadas na DB viva.**

## Performance

- **Duration:** ~2 min (agente de continuação) — trabalho original em ~62 min (waves 1-2)
- **Started:** 2026-07-21T07:53:24Z (finalize do plano de fase)
- **Completed:** 2026-07-21T11:57:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint blocking resolvido)
- **Files modified:** 9 criados

## Accomplishments
- `public.availability_rules` no banco com RLS + 4 policies owner-scoped; sem unique em (profile_id, weekday) para permitir múltiplas faixas/dia (D-02) e slot_minutes por faixa (D-09); CHECKs de múltiplos de 30, end > start, weekday 0..6
- `public.availability_exceptions` no banco com RLS + 4 policies owner-scoped; CHECK (start_minute is null) = (end_minute is null) para folga dia-inteiro ou parcial (D-04); sem coluna additive nem FK de consulta (forward constraint Phase 7)
- 5 módulos CRUD (listAvailabilityRules, upsertAvailabilityRules, listAvailabilityExceptions, createAvailabilityException, deleteAvailabilityException) escopados por profile_id, uma fn por arquivo, SupabaseClient injetado, sem imports proibidos
- Schema Zod (availabilityRuleSchema, saveAvailabilityRulesSchema, createAvailabilityExceptionSchema) com mensagens PT-BR + tipos z.infer
- Migrations aplicadas à DB viva e verificadas: tabelas existem, rls_enabled=true, 4 policies cada, get_advisors (security) sem aviso de RLS-sem-policy

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar as duas migrations owner-scoped com RLS + 4 policies** - `14b0ab3` (feat)
2. **Task 2: Tipos, schema Zod e 5 módulos CRUD escopados por profile_id** - `41d187b` (feat)
3. **Task 3: [BLOCKING] Aplicar a migração ao banco** - sem commit (aplicação de schema à DB viva via MCP; verificada pelo orquestrador, resposta do usuário: "aprovado")

**Plan metadata:** este commit (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260721000100_availability_rules.sql` - Tabela de regras semanais + RLS + 4 policies + CHECKs + índice (profile_id, weekday)
- `supabase/migrations/20260721000200_availability_exceptions.sql` - Tabela de exceções subtrativas + RLS + 4 policies + CHECK nullability coerente + índice (profile_id, exception_date)
- `modules/availability/types.ts` - AvailabilityRuleRow, AvailabilityExceptionRow (snake_case, escopo owner)
- `modules/availability/list-availability-rules.ts` - Leitura das regras do médico, escopada por profile_id
- `modules/availability/upsert-availability-rules.ts` - Substitui a grade inteira (delete-then-insert), profile_id server-side
- `modules/availability/list-availability-exceptions.ts` - Leitura das exceções do médico, escopada por profile_id
- `modules/availability/create-availability-exception.ts` - Insert de exceção com profile_id carimbado, retorna a row
- `modules/availability/delete-availability-exception.ts` - Delete escopado por profile_id + id
- `lib/schemas/availability.ts` - 3 schemas Zod + tipos z.infer com mensagens PT-BR

## Decisions Made
None além das já travadas no plano — executado conforme especificado (D-02, D-04, D-05, D-09, D-13 e a convenção de weekday 0..6 = date-fns getDay()).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Falso positivo de verificação previsto no plano:** build/typecheck passam sem a migração aplicada (os tipos não dependem da tabela viva). Por isso o Task 3 foi um checkpoint bloqueante obrigatório. Resolvido: migrações aplicadas à DB viva e verificadas (tabelas + RLS + 4 policies + advisors limpos) antes de marcar o plano completo.

## Known Stubs
None - nenhum stub. Os módulos são CRUD real escopado; a UI que os consome vem no Plano 03.

## User Setup Required
None - a aplicação das migrations à DB viva já foi executada e verificada neste plano.

## Next Phase Readiness
- Fundação de persistência pronta: Plano 02 pode implementar `expandAvailability` (função pura regras→slots) consumindo AvailabilityRuleRow/AvailabilityExceptionRow.
- Plano 03 pode construir actions (gate auth+paid+Zod) sobre os 5 módulos e o schema Zod já prontos.
- Forward constraint Phase 7 preservada: nenhuma FK de consulta nem coluna additive nas tabelas de disponibilidade.

## Self-Check: PASSED

All created files verified present on disk; both task commits (14b0ab3, 41d187b) verified in git log.

---
*Phase: 06-disponibilidade-calend-rio-do-m-dico*
*Completed: 2026-07-21*

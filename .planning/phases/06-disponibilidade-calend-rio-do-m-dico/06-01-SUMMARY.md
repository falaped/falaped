---
phase: 06-disponibilidade-calend-rio-do-m-dico
plan: 01
subsystem: database
tags: [supabase, postgres, migration, rls, date-fns, timezone, dst, zod, availability]

# Dependency graph
requires:
  - phase: 05 (v1.0, arquivada)
    provides: tabelas availability_rules + availability_exceptions v1 (template recorrente + folgas subtrativas), expandAvailability v1
provides:
  - Modelo de dados HÍBRIDO em availability_exceptions (override_type add|subtract, slot_minutes) preservando as rows v1 via ALTER+backfill
  - expandAvailability v2 pura, DST-safe (wall-clock), com precedência híbrida D-21 (template → aditivos → subtrativos; folga vence)
  - Tipo exportado AvailabilityOverride ({type, slotMinutes}) — contrato consumido pelo RSC (Plano 03) e módulos (Plano 02)
  - Schema Zod endurecido (WR-02 ISO estrita, WR-03 teto 1440, override_type enum, slot condicional) + saveAvailabilitySchema de batch
  - CHECK constraints de teto (1440) + aditivo-precisa-faixa-e-slot no DB vivo
affects: [06-02 módulos CRUD override, 06-03 calendário editável RSC, phase-07 appointments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migração ALTER-only para evoluir tabela com RLS (nunca drop/recreate — preserva 4 policies + rows)"
    - "Backfill auditável com UPDATE explícito após ALTER com default"
    - "Fn pura wall-clock DST-safe: deriva h/m do minute-of-day e setHours no context zonado, nunca addMinutes sobre instante"
    - "Precedência híbrida por dia: coletar template → unir aditivos (dedupe por start.getTime()) → subtrair folgas"
    - "Validação de data ISO estrita via regex + rebuild-and-compare (rejeita rollover 2026-02-30)"

key-files:
  created:
    - supabase/migrations/20260722000000_availability_overrides_hybrid.sql
  modified:
    - lib/expand-availability.ts
    - lib/expand-availability.spec.ts
    - lib/schemas/availability.ts
    - app/dashboard/agenda/page.tsx

key-decisions:
  - "D-20/D-22: rows v1 preservadas e backfilled para override_type='subtract' via ALTER-only (nunca drop/recreate) — confirmado no DB vivo (2==2, subtrativas==2)"
  - "D-21: precedência híbrida — folga (subtrativo) sempre vence disponibilidade (template + aditivo)"
  - "WR-01: limites de slot construídos em wall-clock zonado, removendo addMinutes(dayStart, ...) que derivava 1h em transição DST"
  - "Sem rename de tabela/coluna (mantém availability_exceptions/exception_date) — custo de refactor > benefício cosmético (per RESEARCH)"
  - "AvailabilityException mantido como alias deprecado para call-sites v1 remanescentes (resolvidos no Plano 02/03)"

patterns-established:
  - "Migração ALTER-only sobre tabela RLS: adiciona colunas + CHECKs + backfill sem reemitir enable RLS/policies"
  - "Fn pura determinística (molde computePediatricAge): sem new Date() interno, sem process.env.TZ; helper wallClock para limites zonados"
  - "Zod: teto de minutos .max(1440) espelhando o CHECK do DB nas duas tabelas (defesa em profundidade)"

requirements-completed: [AGENDA-01, AGENDA-02, AGENDA-03, AGENDA-04, AGENDA-05]

coverage:
  - id: D1
    description: "expandAvailability aplica precedência híbrida DST-safe (template → aditivos → subtrativos; folga vence) preservando minutos locais em spring-forward (D-21, WR-01)"
    requirement: "AGENDA-04"
    verification:
      - kind: unit
        ref: "lib/expand-availability.spec.ts (20 casos: 13 migrados + 7 híbridos/DST — yarn test 542/542)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Migração híbrida ALTER+backfill aplicada ao DB vivo: rows v1 preservadas, backfilled subtract, colunas override_type/slot_minutes + 3 CHECKs, RLS + 4 policies intactas, advisors limpos (D-20/D-22)"
    requirement: "AGENDA-01"
    verification:
      - kind: manual_procedural
        ref: "checkpoint Task 4 — mcp__supabase execute_sql/list_tables/get_advisors: antes==depois==2, subtrativas==2, RLS true, 4 policies, sem novo aviso de segurança"
        status: pass
    human_judgment: false
  - id: D3
    description: "Schema Zod de override endurecido: rejeita data ISO ambígua (WR-02), minutos > 1440 (WR-03), exige faixa+slot_minutes>0 em aditivos; saveAvailabilitySchema de batch exportado"
    requirement: "AGENDA-05"
    verification:
      - kind: unit
        ref: "yarn typecheck (tsc --noEmit — clean); grep Date.parse vazio, 1440 ≥2, z.enum add|subtract presente"
        status: pass
    human_judgment: false

# Metrics
duration: ~4min (execução Tasks 1-3; checkpoint Task 4 resolvido pelo orquestrador)
completed: 2026-07-21
status: complete
---

# Phase 6 Plan 01: Fundação de dados & lógica pura do modelo híbrido de disponibilidade — Summary

**Modelo híbrido de disponibilidade (template recorrente + overrides aditivos/subtrativos) com migração ALTER+backfill aplicada ao DB vivo preservando rows v1, expandAvailability v2 puro DST-safe (wall-clock, precedência folga-vence D-21) e schema Zod endurecido (ISO estrita, teto 1440, slot condicional).**

## Performance

- **Duration:** ~4 min (execução das Tasks 1-3; a Task 4 era checkpoint bloqueante resolvido pelo orquestrador)
- **Started:** 2026-07-21T15:05:40-03:00 (primeiro commit de tarefa)
- **Completed:** 2026-07-21 (continuação pós-checkpoint)
- **Tasks:** 4 (3 auto + 1 checkpoint bloqueante)
- **Files modified:** 4 (+1 migração criada)

## Accomplishments
- Migração `20260722000000_availability_overrides_hybrid.sql` ALTER-only: adiciona `override_type text not null default 'subtract'`, `slot_minutes smallint`, backfill auditável e 3 CHECKs (teto 1440 nas duas tabelas + aditivo-precisa-faixa-e-slot). **Aplicada ao DB vivo e verificada** — rows preservadas (2==2), todas backfilled para `subtract` (subtrativas==2), colunas presentes, RLS enabled, 4 policies intactas, `get_advisors` sem novo aviso de segurança.
- `expandAvailability` reescrita para o modelo híbrido DST-safe: novo tipo `AvailabilityOverride` ({type: add|subtract, slotMinutes}), helper `wallClock` que substitui o anti-padrão `addMinutes(dayStart, ...)` (WR-01, corrige derivação de 1h em spring-forward), precedência D-21 (template → união de aditivos com dedupe por `start.getTime()` → subtração de folgas; folga vence).
- Suite `.spec` expandida para 20 casos: 13 casos v1 migrados de `exceptions` para `overrides` + 7 novos (DST spring-forward em America/New_York, aditivo básico/sobre template/com slot próprio, aditivo+subtrativo, subtrativo dia-inteiro, precedência combinada). `yarn test` verde: 542/542.
- Schema `lib/schemas/availability.ts` endurecido: WR-02 (regex ISO estrita `^\d{4}-\d{2}-\d{2}$` + rebuild-and-compare rejeitando rollover), WR-03 (`.max(1440)` nas duas tabelas espelhando o CHECK do DB), `override_type` enum, `slot_minutes` condicional (obrigatório >0 em aditivos), e `saveAvailabilitySchema` de batch ({rules, overridesAdd, overridesRemove}).

## Task Commits

Cada tarefa foi commitada atomicamente:

1. **Task 1: Migração ALTER+backfill híbrida (D-20/D-22, WR-03)** - `b64ee06` (feat)
2. **Task 2: Reescrever expandAvailability híbrida + DST-safe (D-21, WR-01) + .spec** - `497987e` (feat)
3. **Task 3: Endurecer lib/schemas/availability.ts (WR-02/WR-03)** - `2b79dc4` (feat)
4. **Task 4: [BLOCKING] Aplicar migração à DB viva** - aplicada e verificada pelo orquestrador (resposta do usuário: "aprovado"); sem commit de código (mudança de estado do DB vivo)

**Plan metadata:** `docs(06-01): complete plan` (este SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified
- `supabase/migrations/20260722000000_availability_overrides_hybrid.sql` - Migração ALTER+backfill híbrida (override_type, slot_minutes, backfill subtract, 3 CHECKs, teto 1440 em ambas as tabelas)
- `lib/expand-availability.ts` - Fn pura v2 híbrida DST-safe (tipo AvailabilityOverride, helper wallClock, precedência D-21; AvailabilityException mantido como alias deprecado)
- `lib/expand-availability.spec.ts` - 20 casos (13 v1 migrados + 7 híbridos/DST spring-forward)
- `lib/schemas/availability.ts` - Schema de override endurecido (ISO estrita, teto 1440, override_type enum, slot condicional) + saveAvailabilitySchema de batch
- `app/dashboard/agenda/page.tsx` - Call-site RSC adaptado à nova assinatura `overrides` (mapeia folgas v1 como subtrativas) — deviation Rule 3

## Decisions Made
- **ALTER-only, nunca drop/recreate** (D-22): recriar a tabela derrubaria RLS silenciosamente (Pitfall 2/5). O ALTER preserva as 4 policies e as rows; o backfill (`update ... set override_type='subtract'`) mapeia as folgas v1 explicitamente.
- **Folga vence** (D-21): na precedência híbrida, overrides subtrativos são aplicados por último; subtrativo dia-inteiro (`startMinute===null`) remove template E aditivos daquele dia.
- **Wall-clock em vez de addMinutes** (WR-01): limites e avanço de slot construídos derivando h/m do minute-of-day e aplicando `setHours/setMinutes` no context zonado — imune a spring-forward.
- **Sem rename cosmético**: manteve `availability_exceptions`/`exception_date` (custo de refactor > benefício, per RESEARCH).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adaptado o call-site RSC da agenda à nova assinatura de expandAvailability**
- **Found during:** Task 2 (reescrita de expandAvailability)
- **Issue:** A renomeação do parâmetro `exceptions` → `overrides` e do tipo `AvailabilityException` → `AvailabilityOverride` quebrava o import/chamada em `app/dashboard/agenda/page.tsx`, impedindo o typecheck de passar.
- **Fix:** Mapeadas as folgas v1 do RSC para o modelo de override subtrativo (`type: "subtract"`, `slotMinutes: null`) e atualizado o import de tipo. `AvailabilityException` mantido como alias deprecado para eventuais call-sites v1 remanescentes (a serem resolvidos no Plano 02/03). Comentário PT-BR sinaliza que o Plano 03 reescreve o RSC para carregar override_type/slot_minutes reais.
- **Files modified:** app/dashboard/agenda/page.tsx
- **Verification:** `yarn typecheck` limpo; `yarn test` 542/542 verde.
- **Committed in:** `497987e` (parte do commit da Task 2)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** A adaptação do call-site era obrigatória para o typecheck passar após a mudança de assinatura pública da fn. Sem scope creep — mudança mínima e sinalizada como ponte até o Plano 03.

## Issues Encountered
None - as Tasks 1-3 executaram conforme o plano; o checkpoint bloqueante da Task 4 (push da migração ao DB vivo) foi aprovado e verificado pelo orquestrador (rows preservadas, backfill correto, RLS + 4 policies intactas, advisors limpos).

## User Setup Required
None - nenhuma configuração de serviço externo. A migração foi aplicada ao DB vivo durante o checkpoint bloqueante (não requer ação adicional do usuário).

## Next Phase Readiness
- **Plano 02 (módulos CRUD override + action batch):** o contrato de dados (`override_type`, `slot_minutes` no DB) e o schema (`saveAvailabilitySchema` com `overridesAdd`/`overridesRemove`) estão prontos para consumo. Resolver os call-sites v1 remanescentes que ainda usam o alias `AvailabilityException`.
- **Plano 03 (calendário editável + RSC):** o RSC `app/dashboard/agenda/page.tsx` deve ser reescrito para carregar `override_type`/`slot_minutes` reais (aditivos incluídos), substituindo a ponte subtrativa atual.
- **Fundação sólida:** fn pura híbrida DST-safe testada (20 casos), DB vivo evoluído com integridade verificada.

---
*Phase: 06-disponibilidade-calend-rio-do-m-dico*
*Completed: 2026-07-21*

## Self-Check: PASSED
- FOUND: supabase/migrations/20260722000000_availability_overrides_hybrid.sql
- FOUND: lib/expand-availability.ts
- FOUND: lib/expand-availability.spec.ts
- FOUND: lib/schemas/availability.ts
- FOUND: commit b64ee06
- FOUND: commit 497987e
- FOUND: commit 2b79dc4
- yarn test: 542/542 pass; yarn typecheck: clean

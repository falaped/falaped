---
phase: 06-disponibilidade-calend-rio-do-m-dico
plan: 02
subsystem: availability
status: complete
tags: [availability, calendar, timezone, pure-function, date-fns, tdd]
dependency_graph:
  requires:
    - "date-fns v4 (já instalado)"
  provides:
    - "expandAvailability (função pura, coração da expansão de slots)"
    - "CLINIC_TIME_ZONE (single source of truth do fuso)"
    - "@date-fns/tz declarado em package.json"
  affects:
    - "Plano 03 (UI da agenda) consome expandAvailability + byDay"
tech_stack:
  added:
    - "@date-fns/tz ^1.5.0 (named-zone arithmetic via { in: tz() })"
  patterns:
    - "Função pura determinística: tempo/janela/fuso por parâmetro (molde computePediatricAge)"
    - "Intervalos meio-abertos [start,end) com comparação < end"
key_files:
  created:
    - lib/clinic-timezone.ts
    - lib/expand-availability.ts
    - lib/expand-availability.spec.ts
  modified:
    - package.json
    - yarn.lock
decisions:
  - "weekday = 0=domingo..6=sábado (date-fns getDay(), casa com coluna DB do Plano 01)"
  - "@date-fns/tz declarado explicitamente (era phantom 1.4.1; yarn resolveu ^1.5.0)"
metrics:
  duration_minutes: 8
  completed_date: 2026-07-21
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 06 Plan 02: expandAvailability (função pura + suite .spec) Summary

Função pura, determinística e TZ-independente `expandAvailability` (regras + exceções → slots livres `[start,end)` + resumo por dia), coberta por suite `.spec` de 13 casos de borda verde sob `TZ=UTC` e `TZ=America/New_York`, usando `@date-fns/tz` no named zone `America/Sao_Paulo`.

## What Was Built

- **`@date-fns/tz` declarado** em `package.json` (`^1.5.0`) via `yarn add` — antes era phantom (`1.4.1` transitivo em `node_modules`, não declarado).
- **`lib/clinic-timezone.ts`** — `export const CLINIC_TIME_ZONE = "America/Sao_Paulo"`, single source of truth do fuso (constante de código, não env), com JSDoc explicando o uso do named zone (correto para DST histórico 1985–2019).
- **`lib/expand-availability.ts`** — a função pura (D-12) com os tipos `AvailabilityBand`, `AvailabilityException`, `FreeSlot`, `ExpandResult` e a fn `expandAvailability({ rules, exceptions, window: { from, to }, timeZone })`. Toda aritmética de calendário roda em `{ in: tz(timeZone) }`; comparações meio-abertas `< end`; sobra de faixa descartada (D-10); exceções dia-inteiro removem o dia, parciais subtraem slots sobrepostos (D-04); `byDay` resume `freeSlotCount` + `hasAvailability` (D-07).
- **`lib/expand-availability.spec.ts`** — 13 casos `node:test` + `assert/strict`, cada um com `window` + `timeZone` explícitos (nunca lê o relógio), datas construídas via `TZDate` (nunca `new Date("YYYY-MM-DD")`).

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (RED) | Declarar @date-fns/tz, clinic-timezone.ts, suite .spec | `797f09a` | package.json, yarn.lock, lib/clinic-timezone.ts, lib/expand-availability.spec.ts |
| 2 (GREEN) | Implementar expandAvailability até a suite passar | `da46a7e` | lib/expand-availability.ts |

## Verification

- `grep '@date-fns/tz' package.json` → `"@date-fns/tz": "^1.5.0"` ✅
- Suite `.spec` (13 casos): verde sob `TZ=UTC` (535/535) e `TZ=America/New_York` (535/535) ✅
- `yarn typecheck` (`tsc --noEmit`) limpo ✅
- Asserção-chave de fuso: primeiro slot de 2026-07-20 08:00 SP resolve a `2026-07-20T11:00:00.000Z` (UTC-3 em julho, sem DST) — valor absoluto idêntico independente do TZ do processo ✅

## Decisions Made

- **weekday = 0=domingo..6=sábado** (`date-fns` `getDay()`), documentado no JSDoc — casa com a coluna `weekday` da tabela `availability_rules` do Plano 01.
- **@date-fns/tz resolvido para `^1.5.0`** pelo yarn (o phantom era `1.4.1`); mesmo org oficial date-fns, sem postinstall (T-06-SC auditado no 06-RESEARCH, disposition accept).

## Deviations from Plan

None — plano executado exatamente como escrito (fluxo TDD RED → GREEN, sem refactor necessário).

## TDD Gate Compliance

- RED gate: commit `797f09a` (`test(...)`) — suite falhava por `Cannot find module '@/lib/expand-availability'`.
- GREEN gate: commit `da46a7e` (`feat(...)`) — suite verde, typecheck limpo.
- REFACTOR: não necessário (implementação passou limpa na primeira iteração).

## Known Stubs

Nenhum. A função é código de negócio completo e testado; a UI que a consome vem no Plano 03.

## Self-Check: PASSED

- FOUND: lib/clinic-timezone.ts
- FOUND: lib/expand-availability.ts
- FOUND: lib/expand-availability.spec.ts
- FOUND commit: 797f09a
- FOUND commit: da46a7e

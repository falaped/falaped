---
task: 260724-hv6
title: "fix: janela da grade corta as 18h — estende windowEnd + buffer"
status: complete
branch: redesign/agenda-hibrida
commit: 6876935
date: 2026-07-24
files-modified:
  - components/dashboard/agenda/calendar-time-grid.tsx
---

# 260724-hv6: fix da janela da grade que cortava as 18h

## Problema

Na grade de tempo semana/dia, o rótulo da última hora (18:00) e blocos de
consulta próximos ao fim eram cortados. `windowEnd` derivava apenas da
disponibilidade (`minuteRows`), então o último rótulo caía em `top:100%` e era
cortado pelo `overflow-y-hidden`; consultas fora da janela de disponibilidade
também ficavam para fora e eram clipadas.

## Correção

Em `components/dashboard/agenda/calendar-time-grid.tsx`, a computação da janela
passou a cobrir também as consultas posicionadas e a adicionar um buffer final
de `STEP`:

- `rowStart` / `rowEnd`: início/fim derivados de `minuteRows` (como antes).
- `apptStart` / `apptEnd`: mínimo/máximo dos minutos de `positioned` (fallback
  para as linhas quando não há consultas).
- `windowStart = Math.min(rowStart, apptStart)`.
- `windowEnd = Math.max(rowEnd, apptEnd) + STEP` (buffer final).

`totalMinutes`, `hourLabels`, `topPct`, `heightPct`, a linha de agora e as
faixas de fundo derivam de `windowStart`/`windowEnd` e continuam funcionando.
Nenhuma outra parte do arquivo foi alterada. `positioned` e `STEP` já estavam
em escopo (`STEP` importado de `./calendar-day-week-grid`).

## Verificação

- `yarn typecheck` → `Done in 2.65s.` (sem erros)
- `yarn build` → `Done in 14.61s.` (build completa)

## Escopo

Apenas `components/dashboard/agenda/calendar-time-grid.tsx` foi modificado.
Sem mudanças em lib/actions/modules/page.tsx/ui. Sem alterações no ROADMAP.

## Self-Check: PASSED

- FOUND: components/dashboard/agenda/calendar-time-grid.tsx (modificado)
- FOUND: commit 6876935

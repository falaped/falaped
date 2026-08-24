---
task: 260724-ho0
title: Diminuir o tamanho do cabeçalho dos dias na grade da agenda
branch: redesign/agenda-hibrida
status: complete
commit: b1e32b2
files-modified:
  - components/dashboard/agenda/calendar-time-grid.tsx
---

# 260724-ho0: Diminuir o tamanho do cabeçalho dos dias na grade da agenda

Reduziu a altura da faixa de cabeçalho dos dias (seg 21 / qui 23 … + tag "Selecionado") na grade da agenda usando apenas tokens/utilitários Tailwind — sem mudança de comportamento, sem cores hex/rgb, e sem tocar barra de ferramentas ou título da página.

## Changes

Arquivo único: `components/dashboard/agenda/calendar-time-grid.tsx`

1. Ambas as variantes da célula de cabeçalho (`<button>` e `<div>`): `py-2` → `py-1` e `gap-1` → `gap-0.5` (padding vertical e espaçamento internos menores).
2. Bolinha do número de "hoje": `size-7` → `size-6` e `text-sm` → `text-xs`.
3. Badge "Selecionado": adicionado `px-1.5 py-0 text-[10px] leading-tight` (mantido `border-primary text-primary`).

O span do número do dia não-hoje (`text-sm tabular-nums`) foi deixado como estava.

## Verification

- `yarn typecheck` → `Done in 2.46s.` (sem erros)
- Gate hex/rgb no arquivo (`grep -Eic '#[0-9a-fA-F]{3,8}\b|rgba?\('`) → `0`
- `git status --short` → apenas `calendar-time-grid.tsx` modificado

## Deviations from Plan

None - task executed exactly as written.

## Self-Check: PASSED

- FOUND: components/dashboard/agenda/calendar-time-grid.tsx (modified)
- FOUND: commit b1e32b2

---
phase: quick-260724-hdr
plan: 01
subsystem: dashboard/agenda
tags: [ui, agenda, layout, scroll-fix]
status: complete
requires: [components/dashboard/agenda/calendar-editor.tsx, components/dashboard/agenda/calendar-time-grid.tsx]
provides: [altura-medida-agenda, overflow-y-travado]
key-files:
  modified:
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/calendar-time-grid.tsx
decisions:
  - Medir a altura da grade (innerHeight − top − 32) em vez de calc(100svh-16rem) fixo, pois a cadeia de layout é flex-fill sem altura fixa e o chrome real variava.
  - Piso de 320px para telas curtas; calc fixo mantido só como fallback pré-medida (inline height vence).
  - overflow-y-hidden explícito no wrapper da grade para impedir scrollbar-y interno (o overflow-x-auto computava y=auto pela regra CSS).
metrics:
  duration: ~6min
  completed: 2026-07-24
  tasks_completed: 1
  tasks_total: 2
  commit: 11bdc48
---

# Quick 260724-hdr: Fix Calendário com Scroll Vertical (Altura Medida) Summary

Corrigido o scroll vertical da Agenda medindo dinamicamente a altura da grade (Dia/Semana/Mês) em vez do `h-[calc(100svh-16rem)]` fixo, e travando o eixo Y do wrapper da grade — mantendo o scroll horizontal.

## O que foi feito (Task 1)

### A) `calendar-time-grid.tsx`
- Wrapper externo: `overflow-x-auto` → `overflow-x-auto overflow-y-hidden`. Impede scrollbar-y interno pela regra do CSS (definir overflow-x como `auto` computa o eixo Y como `auto` também), preservando o scroll horizontal quando há muitas colunas.

### B) `calendar-editor.tsx`
- Novo `gridContainerRef` (ref único atribuído aos 3 containers de aba — só o montado registra, pois o Radix Tabs desmonta as abas inativas) e estado `gridHeight: number | null` (default `null`).
- `measure()`: `top = ref.getBoundingClientRect().top`; `setGridHeight(Math.max(320, window.innerHeight - top - 32))` — `BOTTOM = 32` (≈ p-8 inferior do layout + folga), piso `MIN_GRID_HEIGHT = 320`.
- `useEffect` recalcula: no mount via `requestAnimationFrame`, em `window` `resize`, via `ResizeObserver` no `document.documentElement`, e sempre que `activeTab` / `dayCursor` / `selectedRailDate` / `monthCursor` mudam (deps). Cleanup remove listener/observer e cancela o rAF.
- Os 3 containers agora usam `className="flex h-[calc(100svh-16rem)] min-h-0 flex-col"` (fallback pré-medida/SSR) + `style={{ height: gridHeight ?? undefined }}` — o inline height sobrescreve o calc assim que mede.
- Nada mais alterado (drawer, tabs, lógica de disponibilidade/consulta intactos).
- Comentários PT-BR; sem novas deps; sem hex/rgb novos.

## Verificação (resultados verbatim)

- `yarn typecheck` → `Done in 2.79s.` (PASS)
- `yarn build 2>&1 | tail -5` → `Done in 17.15s.` (PASS)
- Grep gate 1: `grep -q "overflow-y-hidden" components/dashboard/agenda/calendar-time-grid.tsx` → `GATE 1 PASS: overflow-y-hidden present`
- Grep gate 2: `grep -q "getBoundingClientRect" components/dashboard/agenda/calendar-editor.tsx` → `GATE 2 PASS: getBoundingClientRect present`

## Commit

- `11bdc48` — fix(quick-260724-hdr): medir altura da grade da agenda p/ eliminar scroll vertical (2 arquivos, +57 −4). Somente `components/dashboard/agenda/*.tsx` (nenhum arquivo `.planning/` staged).

## Deviations from Plan

None - plano executado exatamente como escrito.

## Pending Checkpoint

**Task 2 [BLOCKING] — checkpoint:human-verify — PENDENTE.** Verificação visual não executada nem auto-aprovada (gate="blocking").

Passos para o humano:
1. `yarn dev` → `/dashboard/agenda` (perfil pago).
2. Dia, Semana e Mês: NÃO deve haver scroll vertical (nem página, nem grade). A grade termina no rodapé visível.
3. Redimensionar a janela (menor/maior), trocar de aba (Dia/Semana/Mês) e de semana (‹ ›): a altura reajusta sem criar scroll vertical.
4. Muitas colunas na Semana → o scroll HORIZONTAL ainda funciona.

Resume-signal: "aprovado" ou descrever o que ainda rola.

## Self-Check: PASSED

- Arquivos modificados existem: components/dashboard/agenda/calendar-editor.tsx, calendar-time-grid.tsx (FOUND).
- Commit 11bdc48 existe no branch redesign/agenda-hibrida (FOUND).
- Nenhuma deleção acidental no commit.

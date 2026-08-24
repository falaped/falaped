---
phase: quick-260723-m6r
plan: 01
subsystem: dashboard/agenda
status: complete
tags: [ui, agenda, calendar, date-selection]
requires: []
provides:
  - "Seleção de dia no calendário real (cabeçalho Semana + célula Mês) com destaque token-only"
  - "Painel lateral sem mini date-picker nos dois modos (Consulta e Disponibilidade/Folga)"
  - "Recorrência pré-seleciona o weekday do dia selecionado"
affects:
  - components/dashboard/agenda/calendar-time-grid.tsx
  - components/dashboard/agenda/calendar-month-indicator.tsx
  - components/dashboard/agenda/booking-rail.tsx
  - components/dashboard/agenda/availability-panel.tsx
  - components/dashboard/agenda/agenda-side-panel.tsx
  - components/dashboard/agenda/calendar-editor.tsx
tech-stack:
  added: []
  patterns:
    - "Prop opcional onSelectDay torna o cabeçalho da grade um <button> acessível (aria-pressed)"
    - "Dia global (selectedRailDate) derivado em TZDate no fuso da clínica dirige a visão Dia + destaque"
    - "Prefill de weekday na Recorrência semeando weekdays só quando vazio/ao entrar em recurring"
key-files:
  created: []
  modified:
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/calendar-month-indicator.tsx
    - components/dashboard/agenda/booking-rail.tsx
    - components/dashboard/agenda/availability-panel.tsx
    - components/dashboard/agenda/agenda-side-panel.tsx
    - components/dashboard/agenda/calendar-editor.tsx
decisions:
  - "Destaque do dia selecionado = anel token-only (ring-primary) distinto do círculo bg-primary de hoje; os dois coexistem"
  - "Visão Dia deriva a coluna de selectedRailDate (não só dayCursor); prev/hoje/next atualizam o dia global"
  - "Recorrência semeia weekdays apenas quando vazio ou na transição para recurring, preservando multi-seleção manual"
metrics:
  duration: ~15min
  completed: 2026-07-23
---

# Quick Task 260723-m6r: Remover mini calendário — seleção de dia no calendário real Summary

Removido o mini calendário (react-day-picker) do painel lateral nos dois modos e habilitada a seleção de dia clicando no calendário real (cabeçalho do dia na Semana, célula no Mês), com destaque token-only distinto de "hoje", dia global compartilhado e prefill de weekday na Recorrência.

## What Was Built

### Task 1 (tracer) — Seleção de dia no calendário real + destaque (commit `0718244`)
- **calendar-time-grid.tsx**: novas props opcionais `selectedLocalDate?` e `onSelectDay?`. O cabeçalho de cada dia vira `<button type="button">` acessível (`aria-pressed`, `aria-label` PT-BR "Selecionar dia …") quando `onSelectDay` existe, mantendo o layout flex/py. Dia selecionado ganha anel token-only (`ring-2 ring-primary rounded-md`) no cabeçalho e realce na coluna (`bg-primary/5 ring-2 ring-inset ring-primary/40`), distinto do círculo `bg-primary` de hoje (ambos coexistem). Slots/blocos inalterados.
- **calendar-month-indicator.tsx**: nova prop `selectedLocalDate?`; célula ganha `aria-pressed` + anel `ring-2 ring-inset ring-primary`; copy do rodapé trocada para "Clique num dia para selecioná-lo.".
- **calendar-editor.tsx**: `selectedLocalDate={selectedRailDate}` + `onSelectDay={setSelectedRailDate}` nas duas grades (Dia/Semana). Nova derivação `selectedRailDateObj` (TZDate no fuso da clínica a partir de `selectedRailDate`) — a visão Dia renderiza essa coluna (M-1). Nav Dia prev/hoje/next passa a atualizar `selectedRailDate` (com skipWeekend). Mês: `onSelectDay` seta `selectedRailDate` e navega para a aba Dia; passa `selectedLocalDate`.

### Task 2 (auto) — Remover mini calendário do painel + prefill weekday (commit `dd4c956`)
- **booking-rail.tsx**: removido import de `Calendar`, o bloco JSX `<Calendar .../>`, `handleDayPick` e `selectedAsDate`; prop `onSelectedDateChange` removida (dia agora read-only). Subtítulo → "Escolha a duração e um horário livre.".
- **availability-panel.tsx**: removido import de `Calendar`, o JSX, `handleDayPick` e `selectedAsDate`; `onSelectedDateChange` removida. Novas props `selectedDayLongLabel` (exibido sob o subtítulo) e `selectedWeekday`. Effect de prefill semeia `weekdays` com `new Set([selectedWeekday])` ao entrar em "recurring" ou quando o conjunto está vazio ao trocar o dia — preservando multi-seleção manual.
- **agenda-side-panel.tsx**: removida a prop `onSelectedDateChange`; repassa `selectedDayLongLabel` + `selectedWeekday` ao `AvailabilityPanel`.
- **calendar-editor.tsx**: parou de passar `onSelectedDateChange` ao painel; passa `selectedWeekday={weekdayOf(selectedRailDate, timeZone)}` (helper reusado, lib/ não tocado). `setSelectedRailDate` continua wired pela grade/Mês (sem órfão).

## Verify Results (verbatim)

**Task 1 — `yarn typecheck`:**
```
$ tsc --noEmit
Done in 4.14s.
```
PASS.

**Task 2 — Calendar-import gate:**
```
GATE PASS: no Calendar import in booking-rail/availability-panel
```
(`! grep -nE 'from "@/components/ui/calendar"' booking-rail.tsx availability-panel.tsx` → nenhum arquivo retornado.)

**Task 2 — `yarn build`:**
```
Done in 26.16s.
```
PASS (build completo, todas as rotas prerenderizadas sem erro).

**hex/rgb gate (normalizado, ignora comentários e padding do wc):**
```
hex/rgb count (normalized): [0]
GATE PASS: zero hex/rgb
```

## Deviations from Plan

None — plano executado exatamente como escrito. Nenhum arquivo fora da camada de UI foi tocado; `lib/**`, `actions/**`, `modules/**`, `supabase/migrations/**` e `app/dashboard/agenda/page.tsx` permaneceram intactos.

## Known Stubs

None.

## Pending Checkpoint

**Task 3 — `checkpoint:human-verify` gate="blocking" — PENDENTE (aguardando aprovação humana).**

Não executado nem auto-aprovado (gate bloqueante). Verificação manual necessária via `yarn dev` em `/dashboard/agenda` (usuário pago):
1. Mini calendário SUMIU nos dois modos do painel.
2. Semana: clicar no cabeçalho de um dia seleciona/destaca (anel distinto de "hoje"); painel reflete o dia.
3. Mês: clicar numa célula seleciona/destaca; ao ir para Dia, o dia exibido é o selecionado.
4. Dia: dia exibido = selecionado; prev/próximo muda o dia.
5. Trocar Consulta ↔ Disponibilidade/Folga mantém o mesmo dia (M-4).
6. Recorrência: weekday do dia pré-marcado; multi-seleção ainda funciona.
7. Consulta: agendar horário livre + paciente + duração ainda funciona.
8. Slot livre na grade ainda abre "Nova consulta".

**Resume signal:** Digite "approved" ou descreva os problemas encontrados.

## Commits

- `0718244` — feat(quick-260723-m6r): seleção de dia no calendário real (grade + Mês) com destaque
- `dd4c956` — feat(quick-260723-m6r): remover mini calendário do painel + prefill de weekday na recorrência

## Self-Check: PASSED

- Todos os 6 arquivos existem e foram modificados (verificados via git).
- Ambos os commits existem no branch `redesign/agenda-hibrida`.

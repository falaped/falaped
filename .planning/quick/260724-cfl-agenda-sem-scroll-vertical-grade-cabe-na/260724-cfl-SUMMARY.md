---
phase: quick-260724-cfl
plan: 01
status: complete
subsystem: dashboard/agenda
tags: [ui, agenda, drawer, calendar, layout]
requirements: [C-1, C-2, C-3, C-4]
key-files:
  modified:
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/calendar-month-indicator.tsx
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/agenda-side-panel.tsx
    - components/dashboard/agenda/booking-rail.tsx
metrics:
  tasks_completed: 3
  files_modified: 5
  completed: 2026-07-24
---

# Quick Task 260724-cfl: Agenda — sem scroll vertical, dia selecionado "aba ativa", painel vira drawer — Summary

Refinamentos de UI da Agenda (branch `redesign/agenda-hibrida`), somente camada de UI: a grade Dia/Semana/Mês agora preenche a altura da viewport sem scroll vertical (posicionamento por porcentagem + flex, sem px), o dia selecionado ganhou aparência de "aba ativa" distinta do "hoje", e o antigo painel lateral fixo virou um único drawer (`Sheet` side="right") aberto por dois botões da toolbar — com clique num slot livre abrindo o drawer em Consulta com o horário pré-marcado e o `AppointmentCreateDialog` modal aposentado.

## What Was Built

### C-1 — grade sem scroll vertical (Task 1, commit `d06c554`)
- `calendar-time-grid.tsx`: removidos `HOUR_H` (export) e `bodyHeight`. A callback `topOf(minute)` (px) foi substituída por `topPct(minute) = ((minute - windowStart)/totalMinutes)*100` e um helper novo `heightPct(from, to) = ((to-from)/totalMinutes)*100`. Rótulos de hora, faixas de fundo de 30 min, linha de agora e blocos de consulta agora usam `top`/`height` em `%`. O mínimo tolerante de bloco antes era `HOUR_H/2` px; agora é `Math.max(heightPct(start,end), heightPct(start, start+STEP/2))` — sem px.
- Wrapper raiz: `flex h-full flex-col overflow-x-auto`; header do dia `shrink-0`; corpo `grid min-h-0 flex-1`; gutter e colunas com `h-full`. Só `overflow-x-auto` (nenhum `overflow-y`).
- `calendar-month-indicator.tsx`: container externo `flex h-full min-h-0 flex-col`; grid de células `grid-rows-[auto_repeat(6,1fr)] min-h-0 flex-1` (cabeçalho `auto` + 6 linhas `1fr`). Cada célula trocou `min-h-20` por `min-h-0 overflow-hidden`, distribuindo a altura em vez de somar. Nota de rodapé `shrink-0`.

### C-2 — dia selecionado "aba ativa" (Task 2, commit `b995c55`)
- `calendar-time-grid.tsx`: `selectedRing` (`ring-2 ring-primary rounded-md`) → `selectedTab` = `bg-primary/10 text-primary border-b-2 border-primary`, aplicado nos dois ramos (`<button>` com `onSelectDay` e `<div>` estático). O realce lateral da COLUNA do dia selecionado permanece inalterado.
- `calendar-month-indicator.tsx`: célula selecionada trocou `ring-2 ring-inset ring-primary` por `bg-primary/10 text-primary border-b-2 border-primary`. Continua distinta do "hoje" (número em bolinha `bg-primary text-primary-foreground`).

### C-3 + C-4 — drawer pela direita, 2 triggers, slot→Consulta, aposentar dialog (Task 3, commit `dcbd7c2`)
- `calendar-editor.tsx`:
  - Import de `Sheet, SheetContent, SheetHeader, SheetTitle`. Removidos import e render de `AppointmentCreateDialog`/`CreateTarget`, o estado `createTarget`, e as callbacks `buildCreateTarget`/`slotMinutesFor` (só alimentavam o dialog). `appointment-create-dialog.tsx` foi mantido intacto (preserva `DURATION_PRESETS` que o `booking-rail` importa).
  - Novo estado: `drawerOpen`, `drawerMode` (`"consulta"|"disponibilidade"`), `preselectedMinute`.
  - `handleAppointmentCreate(localDate, minute)` reescrito: `setSelectedRailDate(localDate)` + `setPreselectedMinute(minute)` + `setDrawerMode("consulta")` + `setDrawerOpen(true)`.
  - Dois botões na toolbar (`lg:ml-auto`): "+ Nova consulta" (`preselectedMinute=null`, modo consulta) e "Disponibilidade" (modo disponibilidade).
  - Removidas as colunas fixas `lg:w-80 lg:shrink-0` de Dia e Semana; a grade passou a full-width. `PendingRequestsPanel` movido para ABAIXO da grade (largura total) em ambas as views.
  - Um único `<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>` com `<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">`, `SheetHeader`+`SheetTitle` ("Agenda do dia"), hospedando o `AgendaSidePanel` (fora dos TabsContent, renderizado uma vez) com `initialMode={drawerMode}` e `preselectedMinute`.
- `agenda-side-panel.tsx`: novas props `initialMode?` e `preselectedMinute?`. `useState(initialMode ?? "consulta")` + `useEffect` que faz `setMode(initialMode ?? "consulta")` ao mudar `initialMode` (sincroniza entre aberturas). Toggle interno permanece funcional. `preselectedMinute` repassado ao `BookingRail`.
- `booking-rail.tsx`: nova prop `preselectedMinute?`. `useEffect` sobre `[preselectedMinute, selectedDate, freeSlots]` que, se houver um `freeSlot` com esse minuto, chama `setSlotMinute(preselectedMinute)`. Ordenado APÓS o reset-on-day-change para prevalecer.

## Height calc() chrome-offset (C-1) — CONFIRMAR NO CHECKPOINT

Escolhido: **`h-[calc(100svh-16rem)]`** no wrapper interno das 3 views (Dia/Semana/Mês), com `min-h-0 flex-1` internos. O `16rem` (256px) é uma estimativa do "chrome" acima da grade (header do dashboard + toolbar de abas/navegação + botões + a dica de interação). Este valor está **sinalizado para validação humana**: se a grade não couber ou sobrar espaço, ajustar o offset subtraído no checkpoint.

## Verify Results (verbatim)

**Task 1** (`yarn typecheck` + gate hex/rgb normalizado nos 2 arquivos):
```
$ tsc --noEmit
Done in 2.95s.
0
```

**Task 2** (`yarn typecheck` + gate hex/rgb):
```
$ tsc --noEmit
Done in 2.43s.
0
```

**Task 3** (`yarn typecheck`, contagem de dialog/sheet, gate hex/rgb, `yarn build`):
```
$ tsc --noEmit
Done in 2.73s.
--dialog-render-count(expect 0)--
0
--sheet-used(expect >=1)--
1
--no-hex(expect 0)--
0
```
`yarn build`:
```
ƒ Proxy (Middleware)
...
Done in 15.21s.
```
Build limpo — sem erros/avisos; `/dashboard/agenda` compila (Partial Prerender).

Gates finais: `yarn typecheck` e `yarn build` limpos; `<AppointmentCreateDialog` = 0 no editor; `<SheetContent` >= 1; hex/rgb normalizado = 0 em todos os 5 arquivos tocados.

## Deviations from Plan

None — plano executado exatamente como escrito. Detalhes de discricionariedade dentro do previsto:
- No Mês, usei `grid-rows-[auto_repeat(6,1fr)]` (cabeçalho `auto` + 6 linhas iguais) em vez de `grid-rows-6` separando o cabeçalho, porque o cabeçalho dos dias da semana e as 42 células compartilham o MESMO grid de 7 colunas neste componente — assim o cabeçalho não rouba altura das linhas e as 6 semanas distribuem o resto igualmente. Mantém a intenção do plano (preencher a altura, sem `overflow-y`).
- Título do drawer: "Agenda do dia" (PT-BR), conforme sugestão do plano.

## Pending Checkpoint (BLOCKING)

**Task 4 — `checkpoint:human-verify` gate="blocking"** está PENDENTE de aprovação humana. Não foi executado nem auto-aprovado. Verificação visual necessária (ver `260724-cfl-PLAN.md`, Task 4):
1. C-1: Dia/Semana/Mês sem scrollbar vertical própria (scroll horizontal na Semana é aceitável). Se não couber, ajustar o offset de `h-[calc(100svh-16rem)]`.
2. C-2: dia selecionado (Semana e Mês) com aba ativa distinta do "hoje".
3. C-3: "+ Nova consulta" → drawer em Consulta; "Disponibilidade" → drawer em Disponibilidade; toggle funciona dentro do drawer.
4. C-4: slot livre+futuro → drawer em Consulta com horário já marcado; criação ponta-a-ponta; consulta existente ainda abre o detalhe; dialog modal não aparece mais.

Resume-signal: "aprovado" ou descrição dos problemas.

## Self-Check: PASSED

- Arquivos modificados existem (5/5).
- Commits existem: `d06c554` (Task 1), `b995c55` (Task 2), `dcbd7c2` (Task 3).

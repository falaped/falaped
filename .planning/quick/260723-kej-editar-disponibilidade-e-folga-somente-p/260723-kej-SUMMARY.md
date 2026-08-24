---
phase: quick-260723-kej
plan: 01
subsystem: agenda (UI)
status: complete
tags: [agenda, disponibilidade, folga, ui, redesign]
requires: [saveAvailabilityAction, expandAvailability, availability Zod schema]
provides: [agenda-side-panel toggle, availability-panel form, save-on-apply + undo]
affects: [components/dashboard/agenda]
tech-stack:
  added: []
  patterns: [declarative intent -> editor translates -> save-on-the-fly, pure draft mutations, computeDiff(draft-arg)]
key-files:
  created:
    - components/dashboard/agenda/availability-panel.tsx
    - components/dashboard/agenda/agenda-side-panel.tsx
  modified:
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/calendar-editor.tsx
decisions: [D-1, D-2, D-3, D-4, D-5, D-6]
metrics:
  tasks-completed: 2
  tasks-total: 3
  files-created: 2
  files-modified: 2
  completed: 2026-07-23
---

# Quick Task 260723-kej: Editar disponibilidade/folga só pelo painel lateral — Summary

Mudança do modelo de interação da Agenda: a grade Dia/Semana virou SOMENTE
visualização + criar consulta (D-1), e toda a edição de disponibilidade/folga
migrou para um painel lateral com toggle "Consulta ↔ Disponibilidade/Folga",
cujo modo Disponibilidade edita disponibilidade E folga por Período/Dia
inteiro/Recorrência (D-4..D-6) salvando na hora (D-3) com Desfazer. Camada de UI
apenas — o backend (schema Zod, `saveAvailabilityAction`, `expandAvailability`)
foi reusado sem alteração.

## What Was Built

### Task 1 — Grade de tempo read-only + criar consulta (commit `23cb0a2`)
`components/dashboard/agenda/calendar-time-grid.tsx`:
- Removida TODA a maquinaria de gesto de edição: `gestureRef`, estado `preview`,
  `clearGesture`, `handlePointerDown/Enter/Move/Up`, `handleContextMenu`,
  `isPreviewed`, e os wrappers `onPointerLeave`/`onPointerCancel`.
- Removidas as props `onDragSelect` e `onCellMenu` da assinatura.
- Removido o `style={{ touchAction: "none" }}` (só servia ao gesto); mantidos
  `overflow-x-auto` e `select-none`.
- A faixa de fundo de 30 min continua sendo um `<button>` read-only, agora com um
  `onClick` simples (`handleBackgroundClick`): consulta → `onAppointmentSelect`;
  slot LIVRE + futuro → `onAppointmentCreate`; folga/vazio/passado → no-op.
- `aria-label` atualizado (removida a menção a "botão direito para folga");
  `aria-pressed` mantido; cabeçalho, gutter, linha de AGORA e blocos de consulta
  intactos.

### Task 2 — Painel toggle + formulário + salvar-na-hora (commit `8a326a4`)
`agenda-side-panel.tsx` (novo): wrapper `"use client"` com segmented control
Consulta ↔ Disponibilidade/Folga (D-1), estado `mode` default "consulta".
Repassa as props do BookingRail e do AvailabilityPanel; modo Consulta =
`BookingRail` inalterado, modo Disponibilidade = `AvailabilityPanel`.

`availability-panel.tsx` (novo): formulário `"use client"` num `Card`. Reusa o
mini date-picker (`Calendar` `weekStartsOn:1` ptBR) e a conversão string↔Date do
BookingRail; reusa `SLOT_PRESETS`/`DEFAULT_SLOT` e o padrão `TimeSelect`/
`minutesToLabel`/`STEP`. Controles: Tipo (Disponibilidade|Folga), Escopo
(Período|Dia inteiro|Recorrência), Início/Fim (selects 30 min), Duração (só
disponibilidade), toggles Seg..Dom (recorrência, multi-seleção). Prefill 08:00–
18:00 + aviso de janela padrão editável em Disponibilidade+Dia inteiro (D-5);
aviso "Aplicada para os próximos ~6 meses." em Folga+Recorrência (D-2). Validação
inline (fim > início; ≥1 weekday). Emite `AvailabilityIntent` declarativa via
`onApply` — não fala com backend nem draft.

`calendar-editor.tsx`:
- Substituído o `BookingRail` (abas Dia/Semana) pelo `AgendaSidePanel`, com o novo
  handler `onApply={applyAvailabilityIntent}` e `savingAvailability`.
- `applyAvailabilityIntent(intent)`: snapshot `before`, muta um draft LOCAL `next`
  reusando as mutações (agora puras: `addDatePeriod`, `addFolgaPeriod`,
  `addRecurringWeekday`) por caso D-4..D-6, `persistDraft(next)` → `setDraft(next)`
  + `saveAvailabilityAction(computeDiff(next))`. Sucesso: `toast.success` com ação
  "Desfazer" (`persistDraft(before)`). Erro: `setDraft(before)` + `toast.error`.
- `computeDiff`/`monthByDay` refatorados para aceitar um draft (default = state),
  eliminando a corrida do setState assíncrono (exatamente como o plano pediu).
- Folga recorrente: itera hoje → +6 meses (`FOLGA_RECURRING_HORIZON_MONTHS`),
  aplicando `addFolgaPeriod` por data cujo `weekdayOf` está no Set (D-2).
- Removidos: `savedDraft`, `isDirty`, `useEffect` de beforeunload, toolbar
  Salvar/indicador/Descartar, botões e handlers de Limpar
  (`requestClear*`/`confirmClear`/`pendingClear`/`clear*ForDates`/`clearScope*`),
  a guarda de descarte (`runGuarded`/`confirmDiscard`/`pendingAction` + AlertDialogs
  de descarte e de limpeza), o `AvailabilityCellMenu` e o estado `menu`/`scope`/
  `handleCellMenu`/`handleMenuWholeDay`/`handleMenuPeriod`/`handleDragSelect`.
- Navegação por aba passa a chamar `setActiveTab` direto; Mês `onSelectDay` idem.
- Dica de interação reescrita ("clique num horário livre para agendar; edite
  disponibilidade e folga no painel").
- Mantidos: mapeamento de consultas, dialogs, indicador do Mês, minuteRows,
  cellStateOf, railFreeSlots, buildCreateTarget, appointment create/select.

## Verify Results (verbatim)

Task 1:
- `grep -riE "#[0-9a-f]{3,6}|rgb\(" calendar-time-grid.tsx | grep -v '^#' | wc -l`
  → true count `0` (PASS). Nota: o comando exato do plano imprime "hex/rgb
  encontrado" no macOS porque o `wc -l` do BSD produz `       0` (com padding) e o
  `grep -qx 0` exige match exato de linha; a contagem real é 0 — quirk de
  portabilidade do gate, não defeito de código.
- gesto gate (`onDragSelect|onCellMenu|setPointerCapture|onContextMenu`) → `0`
  (PASS).
- `yarn typecheck`: adiado para a Task 2 (o caller ainda passava as props
  removidas até a Task 2 atualizar as chamadas) — verde ao final da Task 2.

Task 2:
- `yarn typecheck` → `Done in 4.62s.` (PASS, sem erros).
- hex/rgb gate (availability-panel + agenda-side-panel + calendar-editor) → true
  count `0` (PASS; mesmo quirk de `wc` do macOS no comando literal).
- rascunho/toolbar/guarda gate
  (`beforeunload|isDirty|savedDraft|AvailabilityCellMenu|pendingClear|runGuarded`)
  em calendar-editor → `0` (PASS; após reescrever 1 menção residual num comentário).
- `AgendaSidePanel` presente em calendar-editor → PASS.
- `yarn build` → `Done in 25.11s.` (PASS).

Escopo (git status): apenas `calendar-editor.tsx` (M) + `agenda-side-panel.tsx`
e `availability-panel.tsx` (novos). Nenhum arquivo de backend/schema/expand/
modules/actions/migrations/page.tsx tocado; `availability-cell-menu.tsx`
consumido sem alteração.

## Deviations from Plan

1. **[Rule 3 — Blocking] `import` órfãos removidos do calendar-editor.**
   Ao remover o rascunho/toolbar/guarda, os imports de `AlertDialog*`, `Loader2`,
   `AvailabilityScope`/`MenuTarget`/`PeriodDraft`/`AvailabilityCellMenu` e do
   `BookingRail` (agora só o tipo `FreeSlot`) ficaram órfãos e quebrariam o
   typecheck/lint. Foram removidos/ajustados como parte necessária da mudança.
2. **Gate hex/rgb — quirk de portabilidade (não é defeito).** O comando literal do
   plano imprime "hex/rgb encontrado" no macOS devido ao padding de espaços do
   `wc -l` do BSD combinado com `grep -qx 0`. A contagem real de hex/rgb é `0` em
   todos os arquivos tocados (verificado com contagem normalizada). Nenhuma cor
   hex/rgb foi introduzida.

Nenhuma mudança arquitetural (Rule 4) foi necessária.

## Known Stubs

Nenhum. Todos os fluxos consomem dados reais (draft → `saveAvailabilityAction`).

## Pending — [BLOCKING] Task 3 (checkpoint:human-verify)

Task 3 é `type="checkpoint:human-verify" gate="blocking"` e NÃO foi executada nem
auto-aprovada. Requer verificação visual humana em `/dashboard/agenda` (perfil
paid), conforme os passos `how-to-verify` do PLAN.md:
- Grade não edita mais disponibilidade (sem arraste/menu/clique-direito), mas
  mostra fundo read-only + cria consulta por clique.
- Painel: toggle Consulta ↔ Disponibilidade/Folga; formulário edita ambos por
  Período/Dia inteiro/Recorrência; salvar na hora com toast Desfazer; Folga
  recorrente aparece ao longo de ~6 meses; F5 sem aviso de "mudanças não salvas".

Sinal de retomada: o humano digita "aprovado" ou descreve os problemas.

## Self-Check

- FOUND: components/dashboard/agenda/availability-panel.tsx
- FOUND: components/dashboard/agenda/agenda-side-panel.tsx
- FOUND: components/dashboard/agenda/calendar-time-grid.tsx
- FOUND: components/dashboard/agenda/calendar-editor.tsx
- FOUND commit: 23cb0a2 (Task 1)
- FOUND commit: 8a326a4 (Task 2)

## Self-Check: PASSED

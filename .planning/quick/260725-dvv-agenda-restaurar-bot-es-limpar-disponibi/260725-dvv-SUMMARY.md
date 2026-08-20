---
phase: quick-260725-dvv
plan: 01
subsystem: agenda
status: complete
tags: [agenda, disponibilidade, folgas, grade-por-hora, card-proporcional, salvar-na-hora]
requires:
  - components/dashboard/agenda/calendar-editor.tsx (persistDraft/saveAvailabilityAction, cloneDraft, weekdayOf, localDateOf)
  - components/dashboard/agenda/calendar-time-grid.tsx (topPct/heightPct por %, positioned)
  - components/dashboard/agenda/availability-panel.tsx (SLOT_PRESETS)
  - components/ui/alert-dialog.tsx
provides:
  - Botões "Limpar disponibilidade"/"Limpar folgas" na toolbar (salvar-na-hora + toast Desfazer)
  - Grade Dia/Semana renderizada por HORA (GRID_STEP=60 desacoplado do STEP=30 do dado)
  - Card de consulta estritamente proporcional à duração
affects:
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/calendar-time-grid.tsx
  - components/dashboard/agenda/availability-panel.tsx
key-files:
  modified:
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/availability-panel.tsx
decisions:
  - "Limpeza em lote RESTAURADA de 11ecfdf mas adaptada ao modelo salvar-na-hora: as funções clearAvailabilityForDates/clearFolgasForDates são puras (recebem/devolvem Draft) e vão a persistDraft (mesma via de applyAvailabilityIntent), com AlertDialog de confirmação + toast Desfazer que re-salva o snapshot anterior."
  - "Escopo dos botões pela aba: Dia = dia SELECIONADO (selectedRailDateObj, o que a grade Dia mostra); Semana = Seg–Sex; Mês = desabilitado. clearScopeNoun 'do dia'/'da semana'."
  - "Grade por HORA é mudança de RENDER, não de dado: GRID_STEP=60 local ao CalendarTimeGrid (fundo = 1 <button> por hora, estado avaliado no minuto de início da hora); STEP=30 (dado/minuteRows/migration % 30) INALTERADO."
  - "Card de consulta com altura proporcional pura heightPct(start,end) + piso mínimo fixo de 0,5 p.p. (só para blocos degenerados clicáveis) — removido o antigo piso STEP/2 que distorcia a proporção."
  - "Duração default da disponibilidade = 60 (estado inicial de slotMinutes e prefill Dia inteiro); DEFAULT_SLOT (constante) NÃO alterada — só o import não usado foi removido do painel."
metrics:
  completed: 2026-07-25
  tasks: 3
  files: 3
---

# Quick 260725-dvv: Restaurar botões Limpar + grade por hora + card proporcional

Devolvida a limpeza em lote ("Limpar disponibilidade"/"Limpar folgas") perdida no redesign kej — agora adaptada ao modelo salvar-na-hora — e trocada a grade Dia/Semana de 30-min-por-linha para HORA-por-linha, com o card de consulta estritamente proporcional à duração (30/60/90 min = ½/1/1,5 linha). Sem tocar no modelo de dados (STEP=30), no `expand-availability` puro nem em migrations.

## O que foi feito

### Task 1 — Botões Limpar (disponibilidade/folgas) adaptados ao salvar-na-hora
`components/dashboard/agenda/calendar-editor.tsx`
- Import de `AlertDialog` (+ subcomponentes) reintroduzido; estado `pendingClear` (`{ title, apply }`).
- `clearAvailabilityForDates(localDates)` e `clearFolgasForDates(localDates)` PORTADAS de 11ecfdf como funções PURAS sobre o draft atual (recebem datas, devolvem o `next: Draft`): a primeira remove `rulePainted`/`ruleDurations` dos weekdays e `addCells` das datas; a segunda remove `subtractCells` das datas.
- `clearAndPersist(next)` espelha o fim de `applyAvailabilityIntent`: captura `before`, chama `persistDraft(next)`; em sucesso mostra `toast.success` com ação "Desfazer" que re-salva `before`; em erro faz rollback (`setDraft(before)`).
- Escopo pela aba: `clearScopeDates` (Dia = `selectedRailDateObj`; Semana = `weekDays`; Mês = `[]`), `clearDisabled` (Mês/vazio), `clearScopeNoun`.
- `requestClearAvailability`/`requestClearFolgas`/`confirmClear` + dois `Button variant="outline" size="sm"` na toolbar de navegação (antes do grupo "+ Nova marcação") e o `AlertDialog` de confirmação com copy PT-BR de ação imediata/desfazível.

### Task 2 — Grade Dia/Semana por HORA + duração default 60
`components/dashboard/agenda/calendar-time-grid.tsx`
- `const GRID_STEP = 60` (passo VISUAL) com comentário de desacoplamento do `STEP=30` (dado).
- `hourRows` (memo): faixas de fundo por hora a partir de `Math.floor(windowStart/60)*60` até `windowEnd`; o fundo passa a renderizar UM `<button>` por hora (era um por 30 min), com estado/bookability avaliados no minuto de início da hora e altura `heightPct(m, m+GRID_STEP)`.
- `hourLabels` mantido (já hora a hora); `minuteRows` continua alimentando `rowStart`/`rowEnd`; nenhuma altura fixa introduzida (preserva fit-sem-scroll de 260724-hdr/hv6).

`components/dashboard/agenda/availability-panel.tsx`
- Estado inicial `slotMinutes` = `60` e prefill "Dia inteiro" = `60` (era `DEFAULT_SLOT`); import `DEFAULT_SLOT` removido (ficou não usado); `DEFAULT_SLOT` (constante) e `TIME_OPTIONS` intactos.

### Task 3 — Card de consulta proporcional (sem piso de meia-célula)
`components/dashboard/agenda/calendar-time-grid.tsx`
- Altura do bloco trocada de `Math.max(heightPct(start,end), heightPct(start, start+STEP/2))` para `Math.max(heightPct(start,end), 0.5)` — proporção pura com piso mínimo fixo (0,5 p.p.) só para blocos degenerados. Resultado (linha=hora): 30min ≈ ½ linha, 60min = linha inteira, 90min transborda para 1,5 linha.
- `APPOINTMENT_STATUS_STYLE` (cell/label/Icon/strike), hachura da Cancelada, precedência ativo>histórico (z-index) e cliques (detalhe / hora livre → Nova consulta) preservados. `calendar-day-week-grid.tsx` (código morto) NÃO tocado.

## must_haves — resultados
- ✅ Grade Dia/Semana mostra 1 linha por HORA (rótulo por hora).
- ✅ Consulta de 60 min ocupa a hora inteira; 30 min = metade; 90 min transborda para 1,5 hora.
- ✅ Botões "Limpar disponibilidade"/"Limpar folgas" na toolbar, escopados pela aba (Dia/Semana/Mês-desabilitado), com AlertDialog + salvar-na-hora + toast Desfazer.
- ✅ `yarn typecheck`, `yarn build` e `yarn test` (547 pass) limpos.
- ✅ STEP=30, `lib/expand-availability.ts`, migrations e schema NÃO alterados.

## Verificação
- `yarn typecheck` — limpo.
- `yarn test` — 547 pass / 0 fail.
- `yarn build` — limpo.
- Sanidade manual (checkpoint visual do usuário) permanece pendente: conferir na UI a grade por hora, os botões escopados e a proporção dos cards.

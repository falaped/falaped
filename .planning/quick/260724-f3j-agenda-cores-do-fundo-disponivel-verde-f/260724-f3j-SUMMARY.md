---
phase: 260724-f3j
plan: 01
subsystem: agenda
tags: [ui, agenda, calendar, oklch, drawer, transitions]
requires: [redesign/agenda-hibrida (du8 + kej + m6r + cfl)]
provides:
  - "--calendar-available / --calendar-available-strong (oklch) em app/globals.css"
  - "verde de disponibilidade em Dia/Semana + ponto do Mês"
  - "botão único de marcação + toggle de 3 opções no drawer"
  - "drawer fecha em sucesso (criar/disponibilidade/folga)"
  - "Confirmar/Recusar para bloco pendente no menu de detalhe"
affects:
  - app/globals.css
  - components/dashboard/agenda/calendar-time-grid.tsx
  - components/dashboard/agenda/calendar-month-indicator.tsx
  - components/dashboard/agenda/agenda-side-panel.tsx
  - components/dashboard/agenda/availability-panel.tsx
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/appointment-detail-menu.tsx
tech-stack:
  added: []
  patterns: [oklch CSS vars via var(), segmented toggle, snapshot-driven AlertDialog]
key-files:
  created: []
  modified:
    - app/globals.css
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/calendar-month-indicator.tsx
    - components/dashboard/agenda/agenda-side-panel.tsx
    - components/dashboard/agenda/availability-panel.tsx
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/appointment-detail-menu.tsx
decisions:
  - "Verde de disponibilidade escolhido: --calendar-available oklch(0.93 0.06 150) (fundo claro) e --calendar-available-strong oklch(0.7 0.13 150) (acento/hover/ponto); dark: fundo oklch(0.55 0.09 150 / 30%) + strong oklch(0.72 0.13 150)."
  - "E-2: fechar o drawer é feito no editor (fonte da verdade do sucesso): setDrawerOpen(false) no ramo result.ok de applyAvailabilityIntent e via onCreated do BookingRail; onApplied não foi necessário."
  - "E-5: Recusar reusa o AlertDialog destrutivo existente (setConfirmCancel) via snapshot pending→canceled; título/copy do diálogo passam a ler p/ recusar e cancelar conforme snapshot.from."
metrics:
  duration: ~15min
  completed: 2026-07-24
status: complete
---

# Quick Task 260724-f3j: Agenda — cores do fundo, drawer fecha, tag do dia, 1 botão, pedidos na grade — Summary

Lote de refinamentos de UI da Agenda (E-1..E-5) na branch `redesign/agenda-hibrida`, camada de UI apenas: verde de disponibilidade em oklch centralizado no globals.css, drawer que fecha ao executar, tag "Selecionado" só no header, botão único com toggle de 3 vias, e Confirmar/Recusar no bloco pendente com remoção da fila "Pedidos a confirmar".

## O que foi construído

- **E-1 (verde de disponibilidade):** duas vars oklch novas em `app/globals.css` (`--calendar-available`, `--calendar-available-strong`) nos 4 blocos de tema (`:root`/`.dark` do `@layer base` + o `:root`/`.dark` standalone). A célula de disponibilidade LIVRE pinta verde via `[background-color:var(--calendar-available)]` com hover no strong em `calendar-time-grid.tsx`; o ponto de disponibilidade do indicador do Mês passa a `[background-color:var(--calendar-available-strong)]`. Folga = `bg-muted` (cinza) e vazio = branco (herda o container) preservados. Os 5 status de consulta (APPOINTMENT_STATUS_STYLE) inalterados.
- **E-2 (drawer fecha ao executar):** no `calendar-editor.tsx`, `setDrawerOpen(false)` no ramo `result.ok` de `applyAvailabilityIntent` (cobre disponibilidade E folga) antes do toast (Desfazer mantido); `onCreated={() => setDrawerOpen(false)}` passado ao `AgendaSidePanel` → `BookingRail` (fecha ao criar consulta). Em erro o drawer permanece aberto com o erro inline.
- **E-3 (só header + Badge):** removido o ramo de realce de coluna/células (`bg-primary/5 ring-2 ...`) no `calendar-time-grid.tsx`; adicionado `Badge` "Selecionado" (variant outline, border/text primary) no `headerContent` quando `isSelected`, distinto do "hoje" (número em bolinha). Mês mantém a barra `border-b-2 border-primary` na célula (discricionário, aceito no plano).
- **E-4 (1 botão + toggle 3 vias):** os 2 botões da toolbar viraram 1 (`+ Nova marcação`); `PanelMode` ampliado para `"consulta" | "disponibilidade" | "folga"`; toggle de 3 opções no `agenda-side-panel.tsx`; `AvailabilityPanel` recebe `initialType` (`available`/`off`) semeando + ressincronizando o estado `type`. Clique num slot livre segue abrindo o drawer em Consulta pré-marcado.
- **E-5 (pedidos na grade):** removidos import, memo `pendingRequests` e as 2 renderizações de `PendingRequestsPanel` do `calendar-editor.tsx` (sem órfãos); `appointment-detail-menu.tsx` ganha ramo `isPending` com Confirmar (pending→confirmed) e Recusar (pending→canceled via AlertDialog destrutivo com snapshot), reusando `transitionAppointmentStatusAction` e a máquina existente. Arquivo `pending-requests-panel.tsx` mantido sem uso.

## Verde escolhido (oklch)

- Light: `--calendar-available: oklch(0.93 0.06 150)`, `--calendar-available-strong: oklch(0.7 0.13 150)`
- Dark: `--calendar-available: oklch(0.55 0.09 150 / 30%)`, `--calendar-available-strong: oklch(0.72 0.13 150)`

## Commits

| Task | Nome | Commit |
| ---- | ---- | ------ |
| 1 (tracer) | E-1 verde de disponibilidade (oklch) | `882f685` |
| 2 | E-3 header+Badge, E-4 1 botão+toggle, E-2 drawer fecha | `ce44ec8` |
| 3 | E-5 remove fila + Confirmar/Recusar | `96da0b0` |

## Resultados de verificação

- `grep calendar-available | -v comentário | grep -c oklch` (globals.css): **8** (4 blocos × 2 vars).
- `yarn typecheck`: **limpo** após cada task (`Done`).
- `yarn build`: **limpo** na Task 3 (`Done in 15.31s`).
- Gate hex/rgb (comment-stripped) nos 6 .tsx tocados: **0** em todos (oklch não flagado).
- `grep -c "PendingRequestsPanel" calendar-editor.tsx`: **0**.
- `grep -cE "isPending|Confirmar|Recusar" appointment-detail-menu.tsx`: **9**.
- Botão de trigger único no editor: **1** (`+ Nova marcação`); o segundo `setDrawerOpen(true)` é o clique-no-slot (`handleAppointmentCreate`), esperado.
- Grep Task 2 (`setDrawerMode|Disponibilidade"`): **3**; `Selecionado` presente no time-grid.

## Deviations from Plan

None — plano executado conforme escrito. As escolhas discricionárias (valores oklch do verde, label do botão "+ Nova marcação", Badge outline p/ "Selecionado", copy do AlertDialog p/ Recusar) foram tomadas dentro do espaço de discrição definido em CONTEXT.md/PLAN.md.

## Known Stubs

None.

## Pending Checkpoint

**Task 4 — checkpoint:human-verify (gate="blocking") — PENDENTE de aprovação humana.**
Verificação visual de E-1..E-5 em `/dashboard/agenda` (`yarn dev`): verde do fundo em Dia/Semana + ponto do Mês; drawer fecha em sucesso e permanece em erro; header + Badge "Selecionado" sem realce de coluna; botão único + toggle de 3 vias + slot livre pré-marcado; sem fila "Pedidos a confirmar" + Confirmar/Recusar no bloco pendente. NÃO executado nem auto-aprovado pelo executor.

## Self-Check: PASSED

- 7/7 arquivos modificados presentes no disco.
- 3/3 commits (`882f685`, `ce44ec8`, `96da0b0`) presentes no histórico.
- Sem alterações de código não commitadas (apenas .planning docs, que o orquestrador commita).

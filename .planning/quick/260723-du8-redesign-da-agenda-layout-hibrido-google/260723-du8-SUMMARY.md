---
phase: quick-260723-du8
plan: 01
subsystem: dashboard/agenda
status: complete
tags: [ui, agenda, calendar, redesign, tokens-only]
requirements: [APPT-01, APPT-02, APPT-03, AGENDA-05]
key-files:
  created:
    - components/dashboard/agenda/appointment-status-style.ts
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/booking-rail.tsx
  modified:
    - components/dashboard/agenda/calendar-day-week-grid.tsx
    - components/dashboard/agenda/appointment-detail-menu.tsx
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/appointment-create-dialog.tsx
metrics:
  tasks-completed: 3
  tasks-total: 3
  completed: 2026-07-23
---

# Quick 260723-du8: Redesign da Agenda (layout híbrido Google Agenda × Calendly) Summary

Camada de UI da Agenda (Fase 7) recomposta para o layout híbrido aprovado no mockup: grade de tempo com blocos posicionados por horário/duração + trilho de agendamento fixo estilo Calendly, 5 status token-only, Dia/Semana/Mês de primeira classe. Tasks 1 e 2 (código) concluídas; Task 3 (verificação visual humana, [BLOCKING]) pendente.

## What Was Built

### Task 1 — Grade de tempo + estilo de status compartilhado (commit `5265345`)
- **`appointment-status-style.ts` (novo):** módulo de dado/estilo puro (sem `"use client"`) com `APPOINTMENT_STATUS_STYLE` (5 status, classes token-only verbatim) e o tipo `CellAppointment`, extraídos de `calendar-day-week-grid.tsx`.
- **`calendar-day-week-grid.tsx`:** removidas as definições locais; passa a re-exportar `APPOINTMENT_STATUS_STYLE`/`CellAppointment` do novo módulo (rota de menor churn — imports antigos seguem funcionando). Removidos imports de ícones lucide agora não usados na grade legada.
- **`appointment-detail-menu.tsx`:** import de `APPOINTMENT_STATUS_STYLE`/`CellAppointment` repontado para `./appointment-status-style`; `MenuAnchor` continua vindo de `./calendar-day-week-grid`.
- **`calendar-time-grid.tsx` (novo, `"use client"`):** nova grade de tempo Dia/Semana. Gutter de horas (HH:00, `text-xs text-muted-foreground`), colunas-dia, altura de hora fixa `HOUR_H=54`, janela vinda de `minuteRows` (não hardcode). Coluna de hoje destacada (`bg-primary/5` + número em badge circular `bg-primary text-primary-foreground`). Linha de agora só na coluna de hoje via `bg-primary` (escolha documentada no JSDoc: vermelho reservado ao status Falta). Consultas como BLOCOS ABSOLUTOS por `top`=offset da hora e `height`=duração; ativo (z-6) à frente do histórico (z-3). Pintura de disponibilidade da Fase 6 PRESERVADA: faixas de 30 min clicáveis atrás dos blocos com a mesma lógica de Pointer Events (pointerDown/Enter/Move/Up + contextMenu, `setPointerCapture`, limiar 6px, distinção clique-vs-arraste).

### Task 2 — Trilho de agendamento fixo + recompor o host (commit `7711344`)
- **`booking-rail.tsx` (novo, `"use client"`):** trilho Calendly. `Card` "Nova consulta" + subtítulo; mini date-picker (`components/ui/calendar` react-day-picker, `weekStartsOn: 1`, `locale ptBR`); busca de paciente (Command/cmdk, filtro client-side por nome/responsável sobre `patients`, estado selecionado + "trocar", empty states verbatim); chips de duração 15/30/45/60/90 (`aria-pressed`, reusa `DURATION_PRESETS`); rótulo do dia longo + lista de horários LIVRES (`aria-pressed`, `tabular-nums`); CTA "Agendar consulta" (desabilitado até paciente+slot, "Agendando..." + Loader2) → `createAppointmentAction`; erro INLINE amigável (`border-destructive/40 bg-destructive/10`, `result.error`); rodapé "Horário de Brasília". Não importa `createPatientAction`.
- **`appointment-create-dialog.tsx`:** `DURATION_PRESETS` agora exportado (fonte compartilhada com o trilho).
- **`calendar-editor.tsx`:** Dia/Semana passam a renderizar `<CalendarTimeGrid>` (blocos derivados via novo `positionedFor(days)` com precedência D-07); `nowMinuteOfToday` (congelado na montagem, fuso da clínica) alimenta a linha de agora. Trilho fixo à direita (`lg:w-80 lg:shrink-0`), empilhado abaixo em telas menores; `PendingRequestsPanel` abaixo do trilho na mesma coluna direita. Novo estado `selectedRailDate` + memo `railFreeSlots` (disponibilidade − consultas ativas, só futuro) + `selectedRailDayLongLabel`. Mês permanece `<CalendarMonthIndicator>` indicador-only; toggle Dia/Semana/Mês intacto; batch save, guarda de descarte, dialog de criação, menus e disponibilidade preservados.

## Verify Results

| Task | Comando | Resultado |
|------|---------|-----------|
| 1 | `yarn typecheck` | PASS (Done in 2.86s) |
| 1 | hex/rgb gate (time-grid + status-style) | 0 |
| 2 | `yarn typecheck` | PASS (Done in 2.68s) |
| 2 | `yarn build` | PASS (Done in 17.08s) |
| 2 | hex/rgb gate (booking-rail + calendar-editor) | 0 |

Todas as greps de acceptance passaram (copy PT-BR verbatim do trilho; reuso de `patients` sem `createPatientAction`; `createAppointmentAction` + erro inline; `DURATION_PRESETS`; `<CalendarTimeGrid`/`<BookingRail`/`<CalendarMonthIndicator` no host; 5 chaves de status; blocos absolutos + pointer capture + `moved` na nova grade).

## Deviations from Plan

None — o plano foi executado como escrito. Notas de decisão dentro do escopo permitido pelo plano:
- Linha de agora em `bg-primary` (não `bg-destructive`), conforme a instrução do plano para não colidir com o vermelho reservado à Falta (documentado no JSDoc de `calendar-time-grid.tsx`).
- Rota de re-export (não repontar todos os call-sites) escolhida para menor churn, conforme o plano permitia; imports antigos continuam válidos.
- Blocos derivados no PAI (`positionedFor`) e passados prontos à grade "burra", conforme a preferência expressa no plano.

## Known Stubs

None. O trilho e a grade consomem dados reais das props já providas pelo RSC (`appointments`, `patients`, `timeZone`, rules/overrides via draft); nenhum dado mock/hardcoded flui para a UI.

## Checkpoint — APROVADO (2026-07-23)

**Task 3 [BLOCKING] — Verificação visual humana do redesign híbrido da agenda** aprovada pelo usuário ("gostei do que foi feito"). Rodou na branch dedicada `redesign/agenda-hibrida` (fallback de worktree: o harness forkava do `origin/main` desatualizado, 74 commits atrás). Follow-up solicitado imediatamente após a aprovação: mover edição de disponibilidade/folga 100% para um painel lateral (dia + período/dia-inteiro/recorrência) e deixar o calendário só para visualizar + marcar consultas — tratado como tarefa separada.

<details><summary>Roteiro original do checkpoint</summary>

`type="checkpoint:human-verify" gate="blocking"` NÃO foi executada nem auto-aprovada pelo executor. Requer sign-off humano rodando `yarn dev` e abrindo `/dashboard/agenda` como perfil pago para confirmar: grade de tempo (Semana, colunas Seg-first, coluna de hoje, linha de agora), trilho fixo (≥lg à direita / empilhado <lg) com criação ponta-a-ponta, double-booking amigável, 5 status distintos (Pendente≠Confirmada, Falta≠Cancelada), disponibilidade da Fase 6 intacta, e Mês indicador-only. Resume-signal: digitar "approved" ou descrever problemas.

</details>

## Self-Check: PASSED
- FOUND: components/dashboard/agenda/appointment-status-style.ts
- FOUND: components/dashboard/agenda/calendar-time-grid.tsx
- FOUND: components/dashboard/agenda/booking-rail.tsx
- FOUND commit: 5265345 (Task 1)
- FOUND commit: 7711344 (Task 2)

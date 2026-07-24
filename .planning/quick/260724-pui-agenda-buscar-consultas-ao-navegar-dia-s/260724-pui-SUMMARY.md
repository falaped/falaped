---
phase: quick-260724-pui
plan: 01
subsystem: agenda
status: complete
tags: [agenda, appointments, client-state, timezone, stale-guard]
requires:
  - modules/appointments/list-appointments-by-profile-id.ts (AppointmentListRow, profile-scoped)
  - actions/appointments/create-appointment.ts (padrão do gate auth + paid)
  - lib/zod-error-message.ts (zodErrorToUserMessage)
  - lib/clinic-timezone.ts (CLINIC_TIME_ZONE)
provides:
  - listAppointmentsByRangeAction (novo action gated por range)
  - CalendarEditor com appointments como estado do cliente buscado por janela visível
affects:
  - components/dashboard/agenda/calendar-editor.tsx
key-files:
  created:
    - actions/appointments/list-appointments-by-range.ts
  modified:
    - actions/appointments/index.ts
    - actions/index.ts
    - components/dashboard/agenda/calendar-editor.tsx
decisions:
  - "Consultas viram ESTADO do cliente semeado pela prop do RSC; re-buscadas por janela visível ao navegar e após criar/transitar. Disponibilidade (rules/overrides via prop) fica inalterada."
  - "useEffect keyed APENAS em primitivos (visibleFrom.getTime(), visibleTo.getTime(), activeTab) para evitar loop de refetch."
  - "Guarda de stale via latestRangeTokenRef: token gravado ANTES do await e checado DEPOIS — resposta antiga nunca sobrescreve navegação mais recente."
  - "router.refresh() removido de onCreated/onChanged (substituído por reloadAppointments); useRouter removido para não quebrar no-unused-vars."
metrics:
  duration: ~6 min
  completed: 2026-07-24
  tasks: 2
  files: 4
---

# Quick 260724-pui: Agenda busca consultas ao navegar (dia/semana/mês) Summary

Consertada a agenda para BUSCAR as consultas da janela VISÍVEL conforme o médico navega (dia/semana/mês), não apenas a semana atual do servidor. As consultas viram estado do cliente, buscadas por range via novo action gated `listAppointmentsByRangeAction`, com re-fetch após criar/transitar e guarda de stale contra respostas obsoletas.

## O que foi feito

### Task 1 — `listAppointmentsByRangeAction` (novo action gated)
- Criado `actions/appointments/list-appointments-by-range.ts` com `"use server"`, gate auth + paid idêntico a `create-appointment.ts`, escopo SEMPRE `profile.id` do servidor (nunca do cliente).
- Zod inline no boundary: `fromIso`/`toIso` como `z.string().datetime()` + `.refine(from < to)`, mensagens PT-BR; falha → `zodErrorToUserMessage`.
- Reusa o módulo existente `listAppointmentsByProfileId` (rows CRUAS `AppointmentListRow[]`); try/catch com copy PT-BR amigável; NÃO chama `next/cache`.
- Exportado dos dois barrels (`actions/appointments/index.ts`, `actions/index.ts`).
- Commit: `182b909`

### Task 2 — CalendarEditor busca a janela visível
- Prop `appointments` renomeada para `appointmentsProp` e semeada em `React.useState<AppointmentRow[]>`.
- `patientById` (memo) + `mapRowsToAppointments` (useCallback) enriquecem as rows cruas → forma local (patient_name/patient_responsible), espelhando page.tsx ~72-86.
- Janela visível `{ visibleFrom, visibleTo }` meio-aberta, fuso da clínica, por aba: semana `[weekStart, +7d)`, mês `[gridStart, +42d)` (mesma origem de `monthByDay`), dia `[startOfDay(sel), +1d)`.
- `reloadAppointments` com `latestRangeTokenRef` (token gravado antes do await, checado depois) → guarda de stale.
- `React.useEffect` keyed em primitivos (`visibleFrom.getTime()`, `visibleTo.getTime()`, `activeTab`) chama `reloadAppointments` na navegação.
- `onCreated`/`onChanged` re-buscam a janela visível; `router.refresh()` e `useRouter` removidos.
- Disponibilidade client-side (`monthByDay`, `expandAvailability`, rules/overrides) INALTERADA.
- Commit: `9811053`

## must_haves — resultados

| Truth | Resultado |
|-------|-----------|
| Navegar para semana/mês/dia fora da semana atual carrega e exibe as consultas daquele range | Atendido — useEffect primitivo-keyed dispara `reloadAppointments(visibleFrom, visibleTo)` por aba |
| Criar consulta em semana futura aparece na hora sem reload completo | Atendido — `onCreated` chama `reloadAppointments` da janela visível |
| Transição de status reflete na hora na grade visível | Atendido — `onChanged` chama `reloadAppointments` da janela visível |
| Resposta de fetch antiga nunca sobrescreve navegação mais recente | Atendido — `latestRangeTokenRef` gravado antes do await, checado depois |
| Re-expansão de disponibilidade na navegação inalterada | Atendido — nenhuma mudança em `monthByDay`/`expandAvailability`/props de rules/overrides |

## Verificação

- `yarn typecheck`: limpo (após Task 1 e após Task 2).
- `yarn build`: limpo (25.71s, sem erros de lint/typecheck).
- Manual (fora do escopo automatizado): navegar para semana/mês com consulta futura, criar consulta em semana futura, transição de status — todos devem refletir via fetch da janela.

## Deviations from Plan

None - plan executado exatamente como escrito. O executor optou por REMOVER ambos os `router.refresh()` (e portanto `useRouter`/`const router`), conforme permitido pelo plano, já que as consultas passam a atualizar via fetch.

## Self-Check: PASSED
- FOUND: actions/appointments/list-appointments-by-range.ts
- FOUND: commit 182b909 (Task 1)
- FOUND: commit 9811053 (Task 2)

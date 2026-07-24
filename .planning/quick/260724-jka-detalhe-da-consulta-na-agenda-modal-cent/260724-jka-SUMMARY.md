---
task: 260724-jka
type: quick
status: complete
description: Detalhe da consulta na agenda — modal centralizado + tipo/motivo (backend→captura→modal→wiring)
completed: 2026-07-24
tasks_completed: 4
commits:
  - 48315dd
  - 366b2aa
  - e5646e6
  - 396ed67
key_files:
  created:
    - supabase/migrations/20260724210000_appointment_reason_type.sql
  modified:
    - modules/appointments/types.ts
    - lib/schemas/appointment.ts
    - actions/appointments/create-appointment.ts
    - modules/appointments/create-appointment.ts
    - modules/appointments/list-appointments-by-profile-id.ts
    - components/dashboard/agenda/appointment-create-dialog.tsx
    - components/dashboard/agenda/booking-rail.tsx
    - components/dashboard/agenda/appointment-status-style.ts
    - components/dashboard/agenda/appointment-detail-menu.tsx
    - app/dashboard/agenda/page.tsx
    - components/dashboard/agenda/calendar-editor.tsx
---

# Quick 260724-jka: Detalhe da consulta na agenda (modal + tipo/motivo) Summary

Enriqueceu o domínio de consultas com `reason` (motivo, opcional) e `type` (tipo, obrigatório), capturou ambos nos dois caminhos de criação (create-dialog e booking-rail), e converteu o detalhe da consulta de Popover ancorado para um MODAL CENTRALIZADO (shadcn Dialog) com ações de transição icon-only + Tooltip PT-BR.

## O que mudou por tarefa

### Task 1 — Backend reason/type (commit `48315dd`)
- **Migration nova** `supabase/migrations/20260724210000_appointment_reason_type.sql`: enum `public.appointment_type` (4 valores exatos `puericultura`/`urgencia`/`retorno`/`primeira_consulta`), coluna `reason text` (nullable) e coluna `type` `not null default 'puericultura'` (backfill seguro de linhas legadas), comments PT-BR em type/colunas. **NÃO aplicada ao banco** (ver nota abaixo).
- `modules/appointments/types.ts`: exporta `AppointmentType`; `AppointmentRow` ganha `reason: string | null` e `type: AppointmentType`.
- `lib/schemas/appointment.ts`: `appointmentTypeSchema` (z.enum + message PT-BR); `createAppointmentSchema` ganha `type` (obrigatório) e `reason` (opcional, `.trim().max(500)`).
- `modules/appointments/create-appointment.ts`: `CreateAppointmentData` ganha `type`/`reason`; insert + select incluem ambos; preservação de `error.code` mantida.
- `actions/appointments/create-appointment.ts`: extrai e repassa `type`/`reason` ao módulo.
- `modules/appointments/list-appointments-by-profile-id.ts`: select + `AppointmentListRow` incluem `reason`/`type`.

### Task 2 — Captura de Tipo/Motivo (commit `366b2aa`)
- `appointment-create-dialog.tsx`: exporta `APPOINTMENT_TYPE_OPTIONS` (4 pares PT-BR); estado `type`/`reason` (reset ao abrir); Select "Tipo" + Textarea "Motivo (opcional)"; valida tipo inline no submit; envia `type`/`reason` ao action.
- `booking-rail.tsx` (caminho primário): importa `APPOINTMENT_TYPE_OPTIONS`; estado `type`/`reason` (reset ao trocar de dia e após sucesso); Select "Tipo" + Textarea "Motivo" entre duração e horários; `canBook` exige `type !== ""`; envia `type`/`reason`.

### Task 3 — Detalhe como modal centralizado (commit `e5646e6`)
- `appointment-status-style.ts`: `CellAppointment` ganha `reason`/`type`; exporta `APPOINTMENT_TYPE_LABEL` (rótulos PT-BR do tipo).
- `appointment-detail-menu.tsx`: Popover/virtual-anchor → `Dialog` centralizado (prop `anchor` removida; `virtualAnchorRef`/import `MenuAnchor` removidos). Corpo exibe paciente (título), badge de status, responsável (condicional), motivo (condicional), tipo (via label) e data/hora. Ações de transição viraram botões **icon-only** (`Button size="icon" variant="ghost"`) com Tooltip PT-BR envolto em `TooltipProvider`, `aria-label` repetindo a copy. AlertDialog destrutivo de cancelar/recusar e o padrão `TransitionSnapshot` preservados verbatim.

### Task 4 — Wiring (commit `396ed67`)
- `app/dashboard/agenda/page.tsx`: `editorAppointments` propaga `reason`/`type` da leitura.
- `calendar-editor.tsx`: `AppointmentRow` local ganha `reason`/`type` (import de `AppointmentType`); ambos os pontos que constroem `CellAppointment` (`appointmentByCell` e `positionedFor`) propagam `reason`/`type`; estado `detail` perdeu `anchor`; `handleAppointmentSelect` mantém a assinatura da grade mas ignora a âncora; `AppointmentDetailMenu` renderizado só com `appointment`/`onOpenChange`.

## Verificação

- `yarn typecheck` passa **clean em toda a árvore** ao final (Task 4). Intermediariamente, após a Task 1 e a Task 3, os únicos erros de typecheck estavam nos arquivos consumidores da tarefa seguinte (esperado e documentado no critical ordering note); resolvidos na tarefa imediatamente seguinte. Cada commit é atômico por tarefa.

## Deviations from Plan

None — plano executado exatamente como escrito.

## Notas ao usuário (user_setup)

- A **migration NÃO foi aplicada ao banco** por esta execução (apenas o arquivo `.sql` foi criado). Os types são escritos à mão, então o código compila e roda sem aplicar. **Antes de usar em produção**, aplicar a migration no Supabase (ex.: `supabase db push` ou via painel) — inserir/ler consultas com `type`/`reason` exige as colunas no banco.

## Self-Check: PASSED

- Migration: FOUND `supabase/migrations/20260724210000_appointment_reason_type.sql`
- Commits: FOUND 48315dd, 366b2aa, e5646e6, 396ed67
- `yarn typecheck`: clean (exit 0)

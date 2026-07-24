---
task: 260724-jka
type: quick
description: Detalhe da consulta na agenda — modal centralizado + tipo/motivo (backend→captura→modal→wiring)
files_modified:
  - supabase/migrations/20260724210000_appointment_reason_type.sql
  - modules/appointments/types.ts
  - lib/schemas/appointment.ts
  - actions/appointments/create-appointment.ts
  - modules/appointments/create-appointment.ts
  - modules/appointments/list-appointments-by-profile-id.ts
  - components/dashboard/agenda/appointment-status-style.ts
  - components/dashboard/agenda/appointment-create-dialog.tsx
  - components/dashboard/agenda/booking-rail.tsx
  - components/dashboard/agenda/calendar-editor.tsx
  - app/dashboard/agenda/page.tsx
  - components/dashboard/agenda/appointment-detail-menu.tsx
---

<objective>
Enriquecer o detalhe de uma consulta agendada na agenda do médico:

1. Adicionar `reason` (motivo, opcional) e `type` (tipo, obrigatório) ao domínio de consultas — migration, types, schema zod, action/módulo de criação e módulo de leitura.
2. Capturar Tipo (Select obrigatório) e Motivo (Textarea opcional) no fluxo de criação de consulta.
3. Converter o detalhe da consulta de Popover ancorado para um MODAL CENTRALIZADO (shadcn Dialog) exibindo paciente, responsável, motivo, tipo, data/hora e badge de status; ações de transição viram ICON-ONLY com Tooltip.
4. Propagar `reason`/`type` da leitura até o `CellAppointment`, através do enriquecimento no RSC e no calendar-editor.

Purpose: o médico precisa ler o contexto da consulta (motivo/tipo) num detalhe legível e centralizado, e classificar cada consulta no ato do agendamento.

Output: migration .sql nova, backend de consultas com reason/type, captura no create-dialog e no booking-rail, e o detalhe como modal centralizado com tooltips.

IMPORTANTE — migration NÃO precisa ser aplicada no banco pela execução: apenas criar o arquivo .sql. Os types são escritos à mão (não gerados do banco), então o código compila sem aplicar. O usuário deve aplicar a migration (supabase) antes de usar em produção.
</objective>

<context>
@/Users/goker1/falaped/CLAUDE.md
@/Users/goker1/falaped/.planning/STATE.md

# Backend de consultas
@/Users/goker1/falaped/modules/appointments/types.ts
@/Users/goker1/falaped/lib/schemas/appointment.ts
@/Users/goker1/falaped/actions/appointments/create-appointment.ts
@/Users/goker1/falaped/modules/appointments/create-appointment.ts
@/Users/goker1/falaped/modules/appointments/list-appointments-by-profile-id.ts
@/Users/goker1/falaped/supabase/migrations/20260722200000_appointments.sql

# Camada de UI/agenda
@/Users/goker1/falaped/components/dashboard/agenda/appointment-status-style.ts
@/Users/goker1/falaped/components/dashboard/agenda/appointment-detail-menu.tsx
@/Users/goker1/falaped/components/dashboard/agenda/appointment-create-dialog.tsx
@/Users/goker1/falaped/components/dashboard/agenda/booking-rail.tsx
@/Users/goker1/falaped/components/dashboard/agenda/calendar-editor.tsx
@/Users/goker1/falaped/app/dashboard/agenda/page.tsx

# Primitives reutilizáveis (já existem — NÃO recriar)
@/Users/goker1/falaped/components/ui/dialog.tsx
@/Users/goker1/falaped/components/ui/tooltip.tsx
@/Users/goker1/falaped/components/ui/textarea.tsx
@/Users/goker1/falaped/components/ui/select.tsx
</context>

<notes>
- DESCOBERTA (ler antes de executar): o caminho PRIMÁRIO e realmente renderizado de criação de consulta é `booking-rail.tsx` (dentro do drawer via AgendaSidePanel). O `appointment-create-dialog.tsx` coexiste como caminho clique-no-slot. A decisão D-4 nomeia o create-dialog; para a captura ficar REAL e funcional no uso, a Tarefa 2 adiciona Tipo/Motivo em AMBOS (create-dialog E booking-rail), compartilhando as opções de tipo.
- O estado `detail` no calendar-editor hoje carrega `{ appointment, anchor }`. Como o detalhe vira modal centralizado, a âncora deixa de ser necessária. CONFIRMADO pela leitura: `anchor` só é usado por `appointment-detail-menu.tsx` (Popover). Simplificar removendo `anchor` do estado `detail` e da prop do menu. As assinaturas `onAppointmentSelect(appointment, anchor)` da grade (`calendar-time-grid.tsx`) permanecem — o editor apenas ignora o `anchor` recebido (não alterar a grade neste task).
</notes>

<tasks>

<task type="auto">
  <name>Task 1: Backend reason/type — migration + types + schema + create action/módulo + leitura</name>
  <files>supabase/migrations/20260724210000_appointment_reason_type.sql, modules/appointments/types.ts, lib/schemas/appointment.ts, actions/appointments/create-appointment.ts, modules/appointments/create-appointment.ts, modules/appointments/list-appointments-by-profile-id.ts</files>
  <action>
Implementa a base de dados/tipos para motivo e tipo de consulta (D-3, D-5).

1. MIGRATION (novo arquivo `supabase/migrations/20260724210000_appointment_reason_type.sql`, timestamp posterior a 20260722200000). Seguir o padrão da migration existente: comments em PT-BR, enum em inglês igual `appointment_status`. Criar o enum `public.appointment_type` com os quatro valores EXATOS `'puericultura'`, `'urgencia'`, `'retorno'`, `'primeira_consulta'`. Adicionar `alter table public.appointments add column reason text` (nullable/opcional). Adicionar a coluna `type public.appointment_type` OBRIGATÓRIA de forma segura para linhas existentes: `add column type public.appointment_type not null default 'puericultura'` — a abordagem com DEFAULT seguro backfila linhas existentes num único passo sem janela nula. Documentar em `comment on column` (PT-BR) que o default só existe para preencher linhas legadas e que a UI sempre envia o tipo escolhido. Adicionar também `comment on type public.appointment_type`. Sem tocar em RLS/policies/constraints existentes.

2. TYPES (`modules/appointments/types.ts`): definir e exportar `export type AppointmentType = "puericultura" | "urgencia" | "retorno" | "primeira_consulta"`. Adicionar a `AppointmentRow` os campos `reason: string | null` e `type: AppointmentType`. Atualizar o JSDoc do arquivo/type mencionando as duas colunas novas.

3. SCHEMA ZOD (`lib/schemas/appointment.ts`): criar e exportar `export const appointmentTypeSchema = z.enum(["puericultura", "urgencia", "retorno", "primeira_consulta"])` com type `AppointmentTypeInput`. No `createAppointmentSchema` adicionar `type: appointmentTypeSchema` (obrigatório, com message PT-BR "Tipo de consulta inválido.") e `reason: z.string().trim().max(500, "Motivo muito longo.").optional()` (opcional). Manter o `.refine` de ends_at.

4. MÓDULO create (`modules/appointments/create-appointment.ts`): estender `CreateAppointmentData` com `type: AppointmentType` e `reason?: string | null`; importar `AppointmentType` do types. No `.insert({...})` incluir `type: input.type` e `reason: input.reason ?? null`. Incluir `reason, type` na lista de colunas do `.select(...)`. Manter a preservação de `error.code`.

5. ACTION create (`actions/appointments/create-appointment.ts`): após o safeParse, extrair `type` e `reason` de `parsed.data` junto de patient_id/starts_at/ends_at. Passar `type` e `reason: reason ?? null` para `createAppointment(...)`. Nenhuma mudança na lógica de slot-free/exclusion.

6. LEITURA (`modules/appointments/list-appointments-by-profile-id.ts`): adicionar `reason` e `type` ao `.select("id, patient_id, status, starts_at, ends_at, reason, type")` e ao type `AppointmentListRow` (`reason: string | null`, `type: AppointmentType` — importar `AppointmentType`).

Convenções: named exports, JSDoc nos exports novos, strings user-facing PT-BR, uma query por arquivo mantida, cliente Supabase injetado (não construir), não importar next/cache|next/headers em modules/.
  </action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn typecheck</automated>
  </verify>
  <done>Migration nova existe com enum appointment_type (4 valores exatos) + coluna reason (nullable) + coluna type (not null default seguro) e comments PT-BR. AppointmentType exportado; AppointmentRow tem reason/type. Schema zod aceita type (obrigatório) e reason (opcional). create action/módulo inserem e selecionam reason/type; list seleciona reason/type. `yarn typecheck` passa.</done>
</task>

<task type="auto">
  <name>Task 2: Captura de Tipo/Motivo na criação (create-dialog + booking-rail)</name>
  <files>components/dashboard/agenda/appointment-create-dialog.tsx, components/dashboard/agenda/booking-rail.tsx</files>
  <action>
Captura de Tipo (obrigatório) e Motivo (opcional) nos DOIS caminhos de criação (D-4). O tipo passa a ser exigido antes de agendar em ambos.

Compartilhar as opções: em `appointment-create-dialog.tsx` definir e exportar `export const APPOINTMENT_TYPE_OPTIONS: { value: AppointmentType; label: string }[]` com os pares PT-BR exatos: puericultura→"Puericultura", urgencia→"Urgência", retorno→"Retorno", primeira_consulta→"Primeira consulta". Importar `AppointmentType` de `@/modules/appointments/types`. (Este arquivo já é o dono do DURATION_PRESETS compartilhado com o booking-rail, então é o lugar natural.)

APPOINTMENT-CREATE-DIALOG (`appointment-create-dialog.tsx`):
- Adicionar estado `const [type, setType] = React.useState<AppointmentType | "">("")` e `const [reason, setReason] = React.useState("")`. Resetar ambos no `useEffect` de abertura (type → "", reason → "").
- Adicionar um campo Select "Tipo" (usar os componentes Select já importados) logo após o bloco de Duração, com `<Label htmlFor="appointment-type">Tipo</Label>`, placeholder no `SelectValue` ("Selecione o tipo"), mapeando `APPOINTMENT_TYPE_OPTIONS`. Marcar como obrigatório visualmente (mesmo padrão de label dos outros campos).
- Adicionar um campo "Motivo" (opcional) com `<Label htmlFor="appointment-reason">Motivo (opcional)</Label>` e um `<Textarea id="appointment-reason">` (importar Textarea de `@/components/ui/textarea`), value/onChange ligados a `reason`, placeholder curto PT-BR (ex.: "Ex.: consulta de rotina, febre há 2 dias…").
- No `handleSubmit`: validar Tipo obrigatório INLINE reusando o `fieldError` existente — se `!type`, `setFieldError("Selecione o tipo da consulta.")` e retornar (antes do setSaving). Passar `type` e `reason: reason.trim() ? reason.trim() : undefined` no objeto de `createAppointmentAction`.

BOOKING-RAIL (`booking-rail.tsx` — caminho primário, precisa ficar funcional):
- Importar `APPOINTMENT_TYPE_OPTIONS` do `./appointment-create-dialog` (ao lado do `DURATION_PRESETS` já importado) e `AppointmentType` de `@/modules/appointments/types`; importar os componentes Select de `@/components/ui/select` e Textarea de `@/components/ui/textarea`.
- Adicionar estado `type` (AppointmentType | "") e `reason` (string). Resetar `type`/`reason` no `useEffect` que reage a `selectedDate` (junto do reset de slot), e também limpar após sucesso no handleSubmit (junto do setSelected(null) etc.).
- Renderizar o Select "Tipo" e o campo Textarea "Motivo (opcional)" entre os chips de Duração e a lista de horários (mesma copy do create-dialog).
- `canBook` passa a exigir `type !== ""` além de selected/selectedSlot/!saving. No `handleSubmit`, retornar cedo se `!type`; passar `type` e `reason: reason.trim() ? reason.trim() : undefined` para `createAppointmentAction`.

Convenções: tokens/classes existentes, copy PT-BR, cn() para composição, sem hex/rgb.
  </action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn typecheck</automated>
  </verify>
  <done>APPOINTMENT_TYPE_OPTIONS exportado do create-dialog com os 4 pares PT-BR. Tanto o AppointmentCreateDialog quanto o BookingRail têm Select Tipo (obrigatório, valida inline) + Textarea Motivo (opcional) e enviam type/reason em createAppointmentAction. `yarn typecheck` passa.</done>
</task>

<task type="auto">
  <name>Task 3: Detalhe como MODAL centralizado + ações icon-only com Tooltip</name>
  <files>components/dashboard/agenda/appointment-status-style.ts, components/dashboard/agenda/appointment-detail-menu.tsx</files>
  <action>
Converter o detalhe da consulta de Popover ancorado para um MODAL CENTRALIZADO (shadcn Dialog) e transformar as ações em botões icon-only com Tooltip (D-1, D-2, D-5).

CELLAPPOINTMENT + LABELS (`appointment-status-style.ts` — arquivo de dado/estilo puro, sem "use client"):
- Importar `AppointmentType` de `@/modules/appointments/types`.
- Adicionar a `CellAppointment` os campos `reason: string | null` e `type: AppointmentType`.
- Exportar `export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string>` com os rótulos PT-BR: puericultura→"Puericultura", urgencia→"Urgência", retorno→"Retorno", primeira_consulta→"Primeira consulta". JSDoc curto explicando que é o mapa de rótulos do tipo (espelha as opções de captura).

DETALHE (`appointment-detail-menu.tsx`):
- Trocar o `PopoverPrimitive` (radix-ui) por `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription` de `@/components/ui/dialog`. Remover a função `virtualAnchorRef`, o import de `MenuAnchor` e a prop `anchor` (o modal é centralizado — âncora não é mais necessária). A prop passa a ser `{ appointment, onOpenChange }`.
- O Dialog é controlado por `open={appointment !== null}` com `onOpenChange`. Preservar 100% o padrão TransitionSnapshot resiliente e o AlertDialog destrutivo de cancelar/recusar EXATAMENTE como está (o snapshot mantém id/from/patientName/dateLabel/timeLabel vivos após o fechamento). O `if (!appointment) return cancelDialog` continua válido.
- CORPO do modal: DialogTitle = nome do paciente; abaixo, uma lista de campos: Responsável (só se `appointment.responsible`), Motivo (só se `appointment.reason` — usar rótulo "Motivo"), Tipo (`APPOINTMENT_TYPE_LABEL[appointment.type]`, rótulo "Tipo"), Data/Hora (`{dateLabel} · {timeLabel}`), e o Badge de status (reusar o `BADGE_VARIANT` + `style.label` já existentes). Layout legível centrado (label pequeno em muted + valor), tokens oklch.
- AÇÕES ICON-ONLY (D-2): substituir os `<button>` de texto por botões de ícone com Tooltip. Importar `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` de `@/components/ui/tooltip` e os ícones lucide `Check`, `CalendarCheck`, `UserX`, `CalendarX`, `X` (usar Button size="icon" variant="ghost", e variant destrutivo/classe destructive para as ações destrutivas). Envolver o grupo de ações com `TooltipProvider`. Cada botão de ícone tem um `TooltipContent` com o texto PT-BR ATUAL do botão:
  - Confirmada: Marcar como realizada (ícone CalendarCheck ou Check) → runTransition done "Consulta marcada como realizada."; Marcar falta (UserX) → runTransition no_show "Falta registrada."; Cancelar consulta (CalendarX, destrutivo) → setConfirmCancel canceled "Consulta cancelada.".
  - Pendente: Confirmar (Check) → runTransition confirmed "Consulta confirmada."; Recusar (X, destrutivo) → setConfirmCancel canceled "Consulta recusada.".
  - Estados finais: manter a mensagem read-only "Consulta finalizada — sem outras ações." (sem botões).
- Manter os toasts (sonner) e o `transitionAppointmentStatusAction` exatamente como estão; manter os snapshots `snapshotFor(to, successMsg)`.
- Cada `aria-label` do Button de ícone deve repetir o texto PT-BR da ação (acessibilidade).

Convenções: "use client" mantido no detail-menu; copy PT-BR verbatim; tokens oklch; sem hex/rgb.
  </action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn typecheck</automated>
  </verify>
  <done>appointment-status-style.ts exporta APPOINTMENT_TYPE_LABEL e CellAppointment tem reason/type. appointment-detail-menu.tsx usa Dialog centralizado (sem Popover/anchor), exibe paciente/responsável/motivo/tipo/data-hora/badge, e as ações são icon-only com Tooltip envolto em TooltipProvider. AlertDialog destrutivo e TransitionSnapshot preservados. `yarn typecheck` passa (o editor ainda não passa reason/type — resolvido na Task 4, mas os campos são opcionais no consumo até lá; garantir que o typecheck feche exigindo a Task 4 se necessário).</done>
</task>

<task type="auto">
  <name>Task 4: Wiring — propagar reason/type no RSC e no calendar-editor; simplificar detail sem anchor</name>
  <files>app/dashboard/agenda/page.tsx, components/dashboard/agenda/calendar-editor.tsx</files>
  <action>
Fechar o fluxo ligando a leitura ao modal e removendo a âncora agora inútil (D-5 + nota).

RSC (`app/dashboard/agenda/page.tsx`):
- No `editorAppointments = appointmentRows.map(...)`, propagar os campos novos: `reason: row.reason`, `type: row.type` (a leitura já os traz após a Task 1).

CALENDAR-EDITOR (`calendar-editor.tsx`):
- No type local `AppointmentRow` (o enriquecido, ~linha 74), adicionar `reason: string | null` e `type: AppointmentType` (o `AppointmentType` já é importável de `@/modules/appointments/types`; adicionar ao import de types existente).
- No `appointmentByCell` (candidate: CellAppointment) e no `positionedFor` (candidate.appointment: CellAppointment), incluir `reason: appt.reason` e `type: appt.type` ao montar o objeto `CellAppointment` (ambos os pontos que constroem CellAppointment).
- Estado `detail`: simplificar de `{ appointment, anchor }` para `{ appointment: CellAppointment }` (remover `anchor`). Ajustar `handleAppointmentSelect(appointment, anchor)` — a assinatura recebida da grade permanece com `anchor` (não mexer em calendar-time-grid), mas o corpo passa a fazer `setDetail({ appointment })` ignorando o `anchor`. Remover o import de `MenuAnchor` se ficar sem uso (conferir: ainda é usado por outras assinaturas? Se sim, manter o import).
- Render do `<AppointmentDetailMenu>`: remover a prop `anchor={detail?.anchor ?? null}`; manter `appointment` e `onOpenChange`.

Convenções: manter tokens/estrutura; sem alterações de lógica de precedência/posicionamento.
  </action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn typecheck</automated>
  </verify>
  <done>editorAppointments no RSC inclui reason/type. O type AppointmentRow local do editor tem reason/type e ambos os CellAppointment construídos (appointmentByCell e positionedFor) propagam reason/type. O estado detail perdeu o anchor e o AppointmentDetailMenu é renderizado só com appointment/onOpenChange. `yarn typecheck` passa em toda a árvore.</done>
</task>

</tasks>

<verification>
- `cd /Users/goker1/falaped && yarn typecheck` passa após cada tarefa (e ao final da árvore inteira).
- Migration nova presente em `supabase/migrations/` com timestamp > 20260722200000; NÃO aplicada ao banco pela execução (nota ao usuário abaixo).
- Nenhum uso remanescente de Popover/virtual-anchor no detalhe da consulta; detalhe é Dialog centralizado com Tooltips.
</verification>

<success_criteria>
- Consulta agendada abre em MODAL CENTRALIZADO com paciente, responsável, motivo, tipo (label PT-BR), data/hora e badge de status.
- Ações de transição são icon-only com Tooltip PT-BR; AlertDialog destrutivo de cancelar/recusar preservado.
- Criar consulta (create-dialog E booking-rail) exige Tipo e aceita Motivo opcional, enviando ambos ao backend.
- reason/type fluem migration→types→schema→action/módulo→leitura→RSC→calendar-editor→CellAppointment→modal.
</success_criteria>

<user_setup>
- APÓS o merge, o usuário deve aplicar a migration no Supabase (ex.: `supabase db push` ou via painel) antes de usar em produção. O código compila e o app roda sem aplicar (types escritos à mão), mas inserir/ler consultas com type/reason exige as colunas no banco.
</user_setup>

<output>
Quick task — sem SUMMARY.md separado exigido; commits atômicos por tarefa.
</output>

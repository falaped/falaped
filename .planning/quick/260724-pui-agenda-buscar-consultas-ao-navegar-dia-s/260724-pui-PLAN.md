---
phase: quick-260724-pui
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - actions/appointments/list-appointments-by-range.ts
  - actions/appointments/index.ts
  - actions/index.ts
  - components/dashboard/agenda/calendar-editor.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Navigating to a week/month/day other than the current server week loads and displays that range's appointments"
    - "Creating an appointment in a future week shows it immediately without a full reload"
    - "A status transition (confirm/refuse/done/no_show/cancel) reflects immediately in the visible grid"
    - "An older in-flight range fetch can never overwrite the appointments of a newer navigation"
    - "Availability (rules/overrides) re-expansion on navigation stays exactly as before"
  artifacts:
    - "actions/appointments/list-appointments-by-range.ts (new gated action)"
    - "CalendarEditor with appointments as client state fetched per visible window"
  key_links:
    - "listAppointmentsByRangeAction → listAppointmentsByProfileId (existing module, profile-scoped)"
    - "useEffect (primitive-keyed) → reloadAppointments → setAppointments"
    - "onCreated / AppointmentDetailMenu.onChanged → reloadAppointments(visibleFrom, visibleTo)"
---

<objective>
Consertar a agenda para BUSCAR as consultas da janela VISÍVEL conforme o médico
navega (dia/semana/mês), não apenas a semana atual do servidor.

Diagnóstico já confirmado pelo orquestrador: `app/dashboard/agenda/page.tsx`
carrega consultas SÓ da semana atual (`weekStart..weekEnd`) e o CalendarEditor
mantém `appointments` como prop FIXA. A navegação client-side re-expande a
disponibilidade mas nunca busca consultas de outras semanas/meses — então
consultas fora da semana atual (ex. 28/07, 24/08) nunca aparecem, mesmo após
`router.refresh()`.

Abordagem escolhida: as consultas viram ESTADO do cliente, buscadas por range
visível via um novo action gated, e re-buscadas após criar/transitar. A
re-expansão de disponibilidade (rules/overrides via prop) fica INALTERADA.

Purpose: consultas de qualquer semana/mês/dia navegado passam a renderizar.
Output: 1 novo action + CalendarEditor buscando a janela visível.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@app/dashboard/agenda/page.tsx
@actions/appointments/create-appointment.ts
@modules/appointments/list-appointments-by-profile-id.ts
@modules/appointments/types.ts
@lib/schemas/appointment.ts
@lib/clinic-timezone.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Novo action gated listAppointmentsByRangeAction (por range)</name>
  <files>actions/appointments/list-appointments-by-range.ts, actions/appointments/index.ts, actions/index.ts</files>
  <action>
Criar `actions/appointments/list-appointments-by-range.ts` com `"use server"` no
topo e a fn `listAppointmentsByRangeAction(fromIso: string, toIso: string)`.

Gate EXATAMENTE como `create-appointment.ts`: `const supabase = await createClient()`;
`const { profile } = await getAuthenticatedUser(supabase)`; se `!profile` →
`{ ok: false, error: "Sessão não encontrada." }`; se `profile.status !== "paid"` →
`{ ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }`.
NUNCA aceitar profile/id do cliente — o escopo é sempre `profile.id` do servidor.

Validar `fromIso`/`toIso` com zod no boundary (safeParse), espelhando o estilo de
`lib/schemas/appointment.ts`: cada campo `z.string().datetime(...)` com mensagem
PT-BR, e um `.refine` garantindo `new Date(fromIso) < new Date(toIso)` (mensagem
PT-BR, ex. "O fim da janela deve ser posterior ao início."). Definir o schema
inline no arquivo do action (objeto `{ fromIso, toIso }`) — não é preciso poluir
`lib/schemas/appointment.ts`. Em falha de parse → `{ ok: false, error: zodErrorToUserMessage(parsed.error) }`
importando `zodErrorToUserMessage` de `@/lib/zod-error-message`.

Chamar o módulo EXISTENTE: `const rows = await listAppointmentsByProfileId(supabase, profile.id, new Date(fromIso), new Date(toIso))`.
Importar de `@/modules/appointments/list-appointments-by-profile-id`. NÃO criar
nem alterar módulo algum.

Tipo de retorno: o módulo retorna `AppointmentListRow[]` (a projeção enxuta, NÃO
`AppointmentRow`). Definir e exportar `export type ListAppointmentsByRangeResult =
{ ok: true; appointments: AppointmentListRow[] } | { ok: false; error: string }`,
importando `AppointmentListRow` de `@/modules/appointments/list-appointments-by-profile-id`.
Envolver a chamada em try/catch: no catch retornar
`{ ok: false, error: "Não foi possível carregar as consultas. Atualize a agenda e tente novamente." }`.
Retornar rows CRUAS (sem enriquecer com nome/responsável — o enriquecimento é do
cliente, Task 2). Este action NÃO chama `revalidatePath`/`next/cache`.

JSDoc na fn exportada explicando: busca as consultas da JANELA visível conforme a
navegação (dia/semana/mês), reusando o módulo profile-scoped; complementa o load
inicial da semana no RSC.

Estender os barrels:
- `actions/appointments/index.ts`: adicionar
  `export { listAppointmentsByRangeAction, type ListAppointmentsByRangeResult } from "./list-appointments-by-range"`.
- `actions/index.ts`: adicionar os mesmos dois exports ao bloco `from "./appointments"`
  já existente (`createAppointmentAction`/`transitionAppointmentStatusAction`).

Convenções CLAUDE.md: named exports, result union no action, strings/comentários
PT-BR, indentação 2 espaços, aspas duplas, semicolon-style igual ao arquivo vizinho
`create-appointment.ts` (sem ponto-e-vírgula ao final das linhas).
  </action>
  <verify>
    <automated>yarn typecheck</automated>
  </verify>
  <done>
`yarn typecheck` limpo. `listAppointmentsByRangeAction` existe, é gated
(auth + paid + escopo profile.id server-side), valida `fromIso`/`toIso` com zod
(datetime + from<to), chama `listAppointmentsByProfileId` e retorna
`{ ok: true; appointments } | { ok: false; error }` com rows cruas. Exportado dos
dois barrels. Nenhum módulo criado/alterado.
  </done>
</task>

<task type="auto">
  <name>Task 2: CalendarEditor busca a janela visível na navegação</name>
  <files>components/dashboard/agenda/calendar-editor.tsx</files>
  <action>
Fazer `appointments` virar ESTADO do cliente, buscado por janela visível.

1) PROP → ESTADO. Na assinatura do componente (~linha 246), renomear a prop:
`appointments: appointmentsProp = []`. Logo após os hooks de estado iniciais (junto
de `dayCursor`/`monthCursor`/`activeTab`, ~linha 276), adicionar
`const [appointments, setAppointments] = React.useState<AppointmentRow[]>(appointmentsProp)`.
Todos os leitores existentes (`appointmentByCell` useMemo ~385, `positionedFor`
useCallback ~482, `railFreeSlots` via `appointmentByCell` ~924) continuam lendo a
variável `appointments` — agora o ESTADO. Mantêm a MESMA forma enriquecida
(`AppointmentRow` local com `patient_name`/`patient_responsible`).

2) MAPA raw→enriquecido. Adicionar um `patientById` (memo) a partir da prop
`patients`: `const patientById = React.useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])`.
Adicionar um helper `mapRowsToAppointments` (useCallback dep `[patientById]`) que
mapeia `AppointmentListRow[]` (a forma CRUA vinda do action) → `AppointmentRow[]`
(a forma local enriquecida), EXATAMENTE como `page.tsx` linhas ~72-86:
`patient_name: patient?.name ?? "Paciente"`, `patient_responsible: patient?.responsible ?? null`,
copiando `id/patient_id/status/reason/type/starts_at/ends_at`. Importar o tipo cru
`AppointmentListRow` de `@/modules/appointments/list-appointments-by-profile-id`.

3) JANELA VISÍVEL [visibleFrom, visibleTo) meio-aberta, fuso da clínica, por aba.
Adicionar um memo derivando `{ visibleFrom, visibleTo }` a partir de `activeTab`,
`dayCursor`, `monthCursor`, `selectedRailDateObj`, `context`:
- `"semana"`: `weekStart = startOfWeek(dayCursor, { ...context, weekStartsOn: 1 })`;
  `from = weekStart`, `to = addDays(weekStart, 7, context)`.
- `"mes"`: `from = startOfWeek(startOfMonth(monthCursor, context), { ...context, weekStartsOn: 1 })`
  (mesma origem do grid do mês já computada em `monthByDay` ~852); `to = addDays(from, 42, context)`.
- `"dia"`: `from = startOfDay(selectedRailDateObj, context)`; `to = addDays(from, 1, context)`.
Importar `startOfDay` de `date-fns` (adicionar ao import existente que já traz
`addDays`/`startOfMonth`/`startOfWeek`). `startOfWeek`, `startOfMonth`, `addDays`,
`addMonths`, `format` já estão importados.

4) reloadAppointments + guarda de stale. Importar `listAppointmentsByRangeAction`
de `@/actions`. Adicionar um `React.useRef` `latestRangeTokenRef` (número ou string)
que guarda o token da última requisição. Criar
`const reloadAppointments = React.useCallback(async (from: Date, to: Date) => {...}, [mapRowsToAppointments])`:
gerar um token (ex. incrementar um contador no ref OU usar a chave
`from.getTime()+":"+to.getTime()`), gravá-lo no ref ANTES do await; chamar
`await listAppointmentsByRangeAction(from.toISOString(), to.toISOString())`; ao
retornar, IGNORAR a resposta se o token não for mais o mais recente do ref (uma
resposta antiga não pode sobrescrever dados mais novos); se `result.ok` e token
ainda atual → `setAppointments(mapRowsToAppointments(result.appointments))`. Em
`!result.ok`, opcional: manter os dados atuais (sem toast obrigatório).

5) useEffect keyed em PRIMITIVOS. Adicionar um `React.useEffect` cujas deps são
APENAS primitivos — `visibleFrom.getTime()`, `visibleTo.getTime()`, `activeTab`
(NUNCA objetos Date, senão dispara em todo render). No corpo do effect chamar
`reloadAppointments(visibleFrom, visibleTo)`. Este effect é o que faz a navegação
carregar as consultas certas. (Incluir `reloadAppointments`/`visibleFrom`/`visibleTo`
no array de deps só se estáveis; se necessário, usar `eslint-disable-next-line
react-hooks/exhaustive-deps` como já feito em `monthByDay` ~894, mantendo as deps
primitivas.)

6) Re-fetch após criar/transitar. No `onCreated` do `AgendaSidePanel` (~1243):
manter `setDrawerOpen(false)` e chamar `reloadAppointments(visibleFrom, visibleTo)`.
No `AppointmentDetailMenu` `onChanged` (~1259): trocar `() => router.refresh()` por
`() => reloadAppointments(visibleFrom, visibleTo)`. As consultas DEVEM refrescar via
este fetch (supersede o `router.refresh()` para consultas). `router.refresh()` pode
ser mantido ou removido nesses handlers — decisão do executor —, MAS a atualização
das consultas TEM de vir do fetch. Se `router` ficar sem uso após remover ambos os
`router.refresh()`, remover também `const router = useRouter()` e o import
`useRouter` para não quebrar o lint/typecheck (no-unused-vars).

7) NÃO TOCAR: a re-expansão de disponibilidade client-side (`monthByDay`,
`expandAvailability`, rules/overrides via prop) fica INALTERADA. Não mexer no
schema/transição, migrations, DB, no módulo `list-appointments-by-profile-id`, nem
no load inicial da semana no `page.tsx` (ele ainda semeia o estado inicial bem).

Convenções CLAUDE.md: 2 espaços, aspas duplas, PT-BR, semicolon-style igual ao
arquivo (sem ponto-e-vírgula ao final).
  </action>
  <verify>
    <automated>yarn typecheck</automated>
    <automated>yarn build</automated>
  </verify>
  <done>
`yarn typecheck` e `yarn build` limpos. `appointments` é estado do cliente semeado
pela prop; a janela visível é derivada por aba (semana/mês/dia) em fuso da clínica
meio-aberta; um `useEffect` primitivo-keyed chama `reloadAppointments` na
navegação; a guarda de stale ignora respostas antigas; criar/transitar re-buscam a
janela visível. Disponibilidade client-side inalterada. Navegar para outra
semana/mês exibe as consultas daquele range; criar uma consulta em semana futura
aparece na hora.
  </done>
</task>

</tasks>

<verification>
- `yarn typecheck` limpo após ambas as tasks.
- `yarn build` limpo após a Task 2.
- Manual (fora do escopo automatizado): navegar para uma semana/mês contendo uma
  consulta futura (ex. 28/07, 24/08) exibe a consulta; criar consulta em semana
  futura aparece imediatamente; transição de status reflete na hora.
</verification>

<success_criteria>
- Consultas de qualquer janela navegada (dia/semana/mês) são buscadas e exibidas.
- Criar/transitar reflete imediatamente via re-fetch (sem reload completo).
- Nenhuma resposta de fetch antiga sobrescreve uma navegação mais recente.
- Re-expansão de disponibilidade e load inicial do RSC inalterados.
</success_criteria>

<output>
Create `.planning/quick/260724-pui-agenda-buscar-consultas-ao-navegar-dia-s/260724-pui-SUMMARY.md` when done
</output>

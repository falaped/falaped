---
phase: quick-260724-cfl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/dashboard/agenda/calendar-time-grid.tsx
  - components/dashboard/agenda/calendar-month-indicator.tsx
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/agenda-side-panel.tsx
  - components/dashboard/agenda/booking-rail.tsx
autonomous: false
requirements: [C-1, C-2, C-3, C-4]

must_haves:
  truths:
    - "Nenhuma view (Dia/Semana/Mês) introduz scrollbar vertical própria — a grade cabe na altura disponível (C-1)."
    - "O cabeçalho do dia selecionado tem aparência de 'aba ativa' visualmente distinta do 'hoje' (C-2)."
    - "O painel lateral abre como drawer pela direita a partir de 2 botões de trigger no topo (C-3)."
    - "O toggle Consulta↔Disponibilidade permanece dentro do drawer; o botão define só o modo inicial (C-3)."
    - "Clicar num slot livre+futuro abre o drawer em Consulta com o horário pré-selecionado na lista (C-4)."
    - "O AppointmentCreateDialog não é mais renderizado no editor; criação ponta-a-ponta funciona pelo drawer (C-4)."
  artifacts:
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/calendar-month-indicator.tsx
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/agenda-side-panel.tsx
    - components/dashboard/agenda/booking-rail.tsx
  key_links:
    - "calendar-editor drawerOpen/drawerMode + preselectedMinute → AgendaSidePanel initialMode → BookingRail preselectedMinute"
    - "onAppointmentCreate no editor → abre drawer em Consulta (não mais setCreateTarget/dialog)"
    - "container flex/percentagem em calendar-time-grid ancorado por altura de viewport no editor"
---

<objective>
Três/quatro refinamentos de UI na Agenda (branch `redesign/agenda-hibrida`), SÓ camada de UI:
- C-1: grade sem scroll vertical (Dia/Semana/Mês) — cabe na altura via porcentagem + flex.
- C-2: dia selecionado com aparência de "aba ativa" distinta do "hoje".
- C-3: painel lateral vira drawer (Sheet, side="right") com 2 botões de trigger.
- C-4: slot livre → drawer em Consulta com horário pré-selecionado; aposentar o dialog modal.

Purpose: consulta pediátrica flui melhor com o calendário inteiro visível e um único caminho de criação (drawer).
Output: 5 componentes editados; dialog modal não mais renderizado; build limpo.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260724-cfl-agenda-sem-scroll-vertical-grade-cabe-na/260724-cfl-CONTEXT.md
@CLAUDE.md
@components/dashboard/agenda/calendar-editor.tsx
@components/dashboard/agenda/calendar-time-grid.tsx
@components/dashboard/agenda/calendar-month-indicator.tsx
@components/dashboard/agenda/agenda-side-panel.tsx
@components/dashboard/agenda/booking-rail.tsx
@components/ui/sheet.tsx

Notas de contrato já verificadas nos arquivos:
- `Sheet` exporta: Sheet, SheetTrigger, SheetClose, SheetContent (side="right" default, `data-[side=right]:sm:max-w-sm`, showCloseButton), SheetHeader, SheetFooter, SheetTitle, SheetDescription.
- `booking-rail.tsx` importa `DURATION_PRESETS` de `./appointment-create-dialog` e `calendar-editor.tsx` importa `CreateTarget`/`AppointmentCreateDialog` do mesmo arquivo. Para MENOR churn: MANTER o arquivo `appointment-create-dialog.tsx` (preserva o export `DURATION_PRESETS` usado por booking-rail) e apenas PARAR de importar/renderizar `AppointmentCreateDialog` + `CreateTarget` no editor.
- `app/dashboard/agenda/page.tsx` é OFF-LIMITS: seu wrapper é `flex flex-col gap-6` sem altura fixa → a âncora de altura de C-1 DEVE ser feita DENTRO do `CalendarEditor` via altura relativa à viewport (ex.: `h-[calc(100svh-<chrome>)]` num wrapper com `min-h-0`), não no page.
- `STEP=30`; janela = `windowStart..windowEnd` (minuteRows[0]..last+STEP); `nowMinuteOfToday` pode ser null.
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: C-1 grade sem scroll vertical (time-grid + month) via % + flex</name>
  <files>components/dashboard/agenda/calendar-time-grid.tsx, components/dashboard/agenda/calendar-month-indicator.tsx</files>
  <action>
Em `calendar-time-grid.tsx` (C-1): remover o posicionamento em px baseado em `HOUR_H`/`bodyHeight` e migrar para porcentagem do total de minutos da janela + flex, mantendo APENAS `overflow-x-auto` (sem overflow-y).
- Manter `windowStart`/`windowEnd`/`totalMinutes`; REMOVER `bodyHeight` e o export/uso de `HOUR_H`. Substituir a callback `topOf(minute)` que devolvia px por uma que devolve porcentagem: `((minute - windowStart) / totalMinutes) * 100`. Adicionar um helper análogo `heightPct(fromMinute, toMinute)` = `((toMinute - fromMinute) / totalMinutes) * 100`.
- O corpo (gutter de horas + colunas-dia) deve preencher a altura: envolver o corpo num container `flex-1 min-h-0` e dar aos elementos de coluna/gutter `h-full` com `position: relative`. Posicionar rótulos de hora, faixas de fundo de 30 min, linha de agora e blocos de consulta por `top`/`height` em `%` (usar `style={{ top: \`${topPct(minute)}%\` }}` e `height: \`${heightPct(...)}%\``). A altura mínima de bloco antes era `HOUR_H/2`; substituir por um mínimo tolerante em %: `Math.max(heightPct(start,end), heightPct(start, start + STEP/2))` — sem px.
- O wrapper raiz do componente passa a ser `flex h-full flex-col` (o header do dia fica `shrink-0`, o corpo `flex-1 min-h-0`), de modo que a grade preencha a altura fornecida pelo pai (Task 3 ancora a altura no editor). Manter `overflow-x-auto` no scroller horizontal e o `min-w` das colunas.
Em `calendar-month-indicator.tsx` (C-1): garantir que o grid do mês caiba na altura sem scroll vertical. O grid de 6×7 usa `min-h-20` por célula hoje; trocar por um layout que preencha a altura: container externo `flex h-full flex-col min-h-0`, e o grid de células com `grid-rows-6 flex-1 min-h-0` (7 colunas) para as células distribuírem a altura em vez de somarem `min-h-20`. Manter o cabeçalho de dias da semana `shrink-0`. Não introduzir `overflow-y`.
NÃO tocar lógica de dados/expansão. Tokens oklch apenas; sem hex/rgb; copy PT-BR intacta.
  </action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn typecheck 2>&1 | tail -5 && grep -RniE "#[0-9a-fA-F]{3,6}|rgb\(" components/dashboard/agenda/calendar-time-grid.tsx components/dashboard/agenda/calendar-month-indicator.tsx | grep -vE "^\s*(//|\*|/\*)" | grep -cE "#[0-9a-fA-F]{3,6}|rgb\(" | tr -d ' '</automated>
  </verify>
  <done>`yarn typecheck` passa; o grep normalizado (ignorando comentários) devolve `0`; `HOUR_H`/`bodyHeight` removidos; posicionamento em % + flex; só `overflow-x-auto`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: C-2 dia selecionado "aba ativa" (header do dia + célula do Mês)</name>
  <files>components/dashboard/agenda/calendar-time-grid.tsx, components/dashboard/agenda/calendar-month-indicator.tsx</files>
  <action>
C-2 em `calendar-time-grid.tsx`: mudar o destaque do cabeçalho do dia SELECIONADO de "anel" (`ring-2 ring-primary rounded-md`) para aparência de ABA ATIVA, token-only e DISTINTA do "hoje" (que já usa o número em bolinha `bg-primary text-primary-foreground`).
- Substituir a variável `selectedRing` por classes de aba ativa aplicadas ao header do dia quando `isSelected`: fundo `bg-primary/10`, texto `text-primary`, e barra inferior grossa `border-b-2 border-primary`. Aplicar tanto no ramo `<button>` (com `onSelectDay`) quanto no ramo `<div>` estático. Manter o realce lateral da COLUNA do dia selecionado como está (não colidir com o header).
- Garantir que o header do dia mantenha `shrink-0` (Task 1) e que a barra inferior não seja recortada.
C-2 em `calendar-month-indicator.tsx`: o destaque de seleção da célula hoje usa `ring-2 ring-inset ring-primary`; trocar por realce análogo de "aba ativa" token-only: `bg-primary/10 text-primary border-b-2 border-primary` na célula selecionada, mantendo-o distinto do "hoje" (número em bolinha `bg-primary text-primary-foreground`) e sem colidir com ele.
Tokens oklch apenas; sem hex/rgb; PT-BR intacto.
  </action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn typecheck 2>&1 | tail -5 && grep -RniE "#[0-9a-fA-F]{3,6}|rgb\(" components/dashboard/agenda/calendar-time-grid.tsx components/dashboard/agenda/calendar-month-indicator.tsx | grep -vE "^\s*(//|\*|/\*)" | grep -cE "#[0-9a-fA-F]{3,6}|rgb\(" | tr -d ' '</automated>
  </verify>
  <done>`yarn typecheck` passa; grep normalizado devolve `0`; header do dia selecionado usa `bg-primary/10`+`text-primary`+`border-b-2 border-primary`, distinto do "hoje"; célula do Mês com realce análogo.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: C-3+C-4 drawer pela direita, 2 triggers, slot→Consulta, aposentar dialog</name>
  <files>components/dashboard/agenda/calendar-editor.tsx, components/dashboard/agenda/agenda-side-panel.tsx, components/dashboard/agenda/booking-rail.tsx</files>
  <action>
C-4 primeiro — `booking-rail.tsx`: aceitar uma prop opcional `preselectedMinute?: number | null` e, num `React.useEffect` sobre `[preselectedMinute, selectedDate]`, se ela existir e houver um `freeSlots` com esse `minute`, chamar `setSlotMinute(preselectedMinute)` (marca o slot na lista). Não remover o reset existente ao trocar `selectedDate`; ordenar os efeitos para que o preselect prevaleça quando presente.
`agenda-side-panel.tsx`: aceitar prop opcional `initialMode?: "consulta" | "disponibilidade"` e usar como estado inicial do `mode` (`useState(initialMode ?? "consulta")`); manter o toggle interno funcional (o botão define só o modo inicial, C-3). Aceitar e repassar `preselectedMinute?: number | null` ao `BookingRail`. Sincronizar quando `initialMode` mudar entre aberturas: adicionar `React.useEffect` que faz `setMode(initialMode ?? "consulta")` ao mudar `initialMode`.
`calendar-editor.tsx` (C-3+C-4):
- Importar `Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger` de `@/components/ui/sheet` e `Button` (já importado).
- Remover a renderização e o import de `AppointmentCreateDialog`/`CreateTarget` e o estado `createTarget`/`buildCreateTarget`/`setCreateTarget`. NÃO apagar o arquivo `appointment-create-dialog.tsx` (preserva `DURATION_PRESETS` usado por booking-rail — menor churn).
- Adicionar estado `const [drawerOpen, setDrawerOpen] = React.useState(false)`, `const [drawerMode, setDrawerMode] = React.useState<"consulta"|"disponibilidade">("consulta")` e `const [preselectedMinute, setPreselectedMinute] = React.useState<number|null>(null)`.
- Reescrever `handleAppointmentCreate(localDate, minute)`: setar `setSelectedRailDate(localDate)` (o drawer opera no dia selecionado global), `setPreselectedMinute(minute)`, `setDrawerMode("consulta")`, `setDrawerOpen(true)`. (Clique numa consulta segue em `handleAppointmentSelect` → detalhe, inalterado.)
- Adicionar dois botões na toolbar (junto ao bloco de navegação, dentro do `<div className="flex flex-wrap items-center gap-x-4 gap-y-2">`): "+ Nova consulta" (`onClick` → setPreselectedMinute(null), setDrawerMode("consulta"), setDrawerOpen(true)) e "Disponibilidade" (`onClick` → setDrawerMode("disponibilidade"), setDrawerOpen(true)). Copy PT-BR.
- Remover as DUAS colunas fixas `lg:w-80 lg:shrink-0` (nos TabsContent "dia" e "semana"): a grade passa a `min-w-0 flex-1` ocupando a largura total; o `PendingRequestsPanel` que vivia na coluna direita deve permanecer visível — movê-lo para ABAIXO da grade em ambas as views (empilhado, largura total) OU para dentro do drawer no modo consulta; escolher ABAIXO da grade (menor churn de props). O `AgendaSidePanel` sai das colunas e passa a ser o conteúdo do drawer único (renderizado uma vez, fora dos TabsContent).
- Renderizar um único `<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>` com `<SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">` contendo `SheetHeader`+`SheetTitle` (título PT-BR, ex.: "Agenda do dia") e o `AgendaSidePanel` passando `initialMode={drawerMode}`, `preselectedMinute={preselectedMinute}` e as props existentes (`patients`, `selectedDate`, `selectedDayLongLabel`, `selectedWeekday`, `freeSlots`, `onApply`, `savingAvailability`). O drawer usa o dia selecionado global (`selectedRailDate`).
- Ancorar a altura para C-1: envolver a área do calendário (os TabsContent) de modo que a grade receba altura previsível relativa à viewport — aplicar num wrapper interno do editor `min-h-0` + `h-[calc(100svh-16rem)]` (ajustar o chrome subtraído para o header/toolbar/dica; valor a validar no checkpoint) no container que hospeda o `CalendarTimeGrid`, com `flex-1 min-h-0`. NÃO editar `app/dashboard/agenda/page.tsx`.
Manter o toggle Consulta↔Disponibilidade DENTRO do drawer (via AgendaSidePanel). Tokens oklch; PT-BR; sem deps novas.
  </action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn typecheck 2>&1 | tail -8 && echo "--dialog-render-count(expect 0)--" && grep -cE "<AppointmentCreateDialog" components/dashboard/agenda/calendar-editor.tsx | tr -d ' ' && echo "--sheet-used(expect >=1)--" && grep -cE "<SheetContent" components/dashboard/agenda/calendar-editor.tsx | tr -d ' ' && echo "--no-hex(expect 0)--" && grep -RniE "#[0-9a-fA-F]{3,6}|rgb\(" components/dashboard/agenda/calendar-editor.tsx components/dashboard/agenda/agenda-side-panel.tsx components/dashboard/agenda/booking-rail.tsx | grep -vE "^\s*(//|\*|/\*)" | grep -cE "#[0-9a-fA-F]{3,6}|rgb\(" | tr -d ' ' && echo "--build--" && yarn build 2>&1 | tail -12</automated>
  </verify>
  <done>`yarn typecheck` e `yarn build` passam; `<AppointmentCreateDialog` count = `0`; `<SheetContent` count >= `1`; grep normalizado de hex/rgb = `0`; drawer abre pela direita, 2 botões, slot livre pré-seleciona o horário no BookingRail, toggle dentro do drawer.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Verificação visual humana (C-1..C-4)</name>
  <what-built>
    Refinamentos de UI da Agenda (C-1..C-4) na branch `redesign/agenda-hibrida`: grade sem scroll vertical (Dia/Semana/Mês), dia selecionado com aba ativa, painel virou drawer pela direita com 2 botões, e slot livre abre o drawer em Consulta com horário pré-marcado (dialog modal aposentado).
  </what-built>
  <how-to-verify>
    1. `cd /Users/goker1/falaped && yarn dev`, abrir `/dashboard/agenda` autenticado (perfil paid).
    2. C-1: em Dia, Semana e Mês, confirmar que NENHUMA view tem scrollbar VERTICAL própria — a grade cabe na altura da viewport. (Scroll horizontal na Semana com muitas colunas é aceitável.) Se a grade não couber por causa do valor de chrome subtraído em `h-[calc(100svh-16rem)]`, ajustar o offset.
    3. C-2: selecionar um dia diferente de hoje no cabeçalho (Semana) e no Mês — o dia selecionado deve ter aspecto de ABA ATIVA (fundo primary/10, texto primary, barra inferior) VISUALMENTE DISTINTO do "hoje" (número em bolinha).
    4. C-3: clicar "+ Nova consulta" → drawer entra pela direita em modo Consulta; clicar "Disponibilidade" → drawer em modo Disponibilidade. O toggle Consulta↔Disponibilidade continua funcionando DENTRO do drawer.
    5. C-4: clicar num slot LIVRE+futuro na grade → drawer abre em Consulta com aquele horário JÁ marcado na lista de horários. Concluir uma criação ponta-a-ponta (buscar paciente, agendar). Clicar numa consulta existente ainda abre o detalhe/transição. Confirmar que o dialog modal NÃO aparece mais.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva os problemas (ex.: offset de altura, cor da aba, pré-seleção do slot).</resume-signal>
</task>

</tasks>

<verification>
- `yarn typecheck` e `yarn build` limpos após a Task 3.
- Gate hex/rgb normalizado (ignorando comentários) = 0 em todos os 5 arquivos tocados.
- `<AppointmentCreateDialog` não renderizado no editor; `<SheetContent` presente.
- Checkpoint humano confirma C-1..C-4 visualmente e a criação ponta-a-ponta.
</verification>

<success_criteria>
- C-1: sem scroll vertical em Dia/Semana/Mês (grade cabe na altura via % + flex).
- C-2: dia selecionado com aba ativa distinta do "hoje" (grade e Mês).
- C-3: painel vira drawer (Sheet side="right") aberto por 2 botões; toggle dentro do drawer.
- C-4: slot livre → drawer Consulta com horário pré-marcado; dialog modal aposentado; build limpo.
- Só camada de UI; nenhum arquivo em lib/actions/modules/supabase/page.tsx tocado.
</success_criteria>

<output>
Create `.planning/quick/260724-cfl-agenda-sem-scroll-vertical-grade-cabe-na/260724-cfl-01-SUMMARY.md` when done
</output>
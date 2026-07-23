---
phase: quick-260723-kej
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/dashboard/agenda/calendar-time-grid.tsx
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/availability-panel.tsx
  - components/dashboard/agenda/agenda-side-panel.tsx
autonomous: false
requirements: [D-1, D-2, D-3, D-4, D-5, D-6]
must_haves:
  truths:
    - "A grade de tempo (Dia/Semana) NÃO edita mais disponibilidade: sem arraste/pintura, sem menu de disponibilidade/folga disparado por clique, sem clique-direito-folga."
    - "A grade AINDA mostra o fundo read-only (livre/folga/vazio) e os blocos de consulta, e um clique num slot LIVRE+futuro abre a criação de consulta; menu de detalhe/transição da consulta continua."
    - "O painel lateral tem um toggle Consulta ↔ Disponibilidade/Folga (D-1); Consulta = BookingRail atual, Disponibilidade = novo formulário."
    - "O formulário edita disponibilidade E folga por Período, Dia inteiro e Recorrência, mapeando ao backend conforme D-4..D-6."
    - "Cada aplicação salva imediatamente via saveAvailability com o payload completo recomputado (D-3); toast de sucesso com Desfazer; erro → rollback + toast."
    - "Folga recorrente expande em overrides subtract por data no horizonte ~6 meses (D-2) e a UI sinaliza isso."
  artifacts:
    - components/dashboard/agenda/availability-panel.tsx
    - components/dashboard/agenda/agenda-side-panel.tsx
    - components/dashboard/agenda/calendar-time-grid.tsx
    - components/dashboard/agenda/calendar-editor.tsx
  key_links:
    - "calendar-editor.tsx aplica mutações do painel no MESMO modelo draft (rulePainted/addCells/subtractCells/ruleDurations) e chama computeDiff → saveAvailabilityAction."
    - "availability-panel.tsx reusa o mini date-picker (Calendar weekStartsOn:1 ptBR) e os selects de horário/duração do padrão de availability-cell-menu.tsx."
---

<objective>
Mover 100% a edição de disponibilidade/folga para o painel lateral. O calendário
(grade Dia/Semana + Mês) vira SOMENTE visualização + marcação de consultas. O
painel ganha um toggle "Consulta ↔ Disponibilidade/Folga" (D-1); o modo
Disponibilidade é um formulário que edita disponibilidade E folga por Período,
Dia inteiro e Recorrência (D-4..D-6), salvando imediatamente (D-3) com Desfazer.

Purpose: reduzir a fricção de edição (gestos de pintura na grade eram frágeis e
misturavam "marcar consulta" com "editar disponibilidade") e centralizar a
edição num formulário explícito por dia.

Output: grade simplificada (read-only + criar consulta), novo painel com toggle
e formulário de disponibilidade, salvar-na-hora com undo. CAMADA DE UI apenas —
o backend (schema Zod, saveAvailability RPC, expandAvailability) é reusado sem
alteração.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/quick/260723-kej-editar-disponibilidade-e-folga-somente-p/260723-kej-CONTEXT.md
@CLAUDE.md
@components/dashboard/agenda/calendar-editor.tsx
@components/dashboard/agenda/calendar-time-grid.tsx
@components/dashboard/agenda/availability-cell-menu.tsx
@components/dashboard/agenda/booking-rail.tsx
@lib/schemas/availability.ts

Notas de contrato (para não reabrir os arquivos de backend):
- `saveAvailabilityAction(input)` aceita `{ rules[], overridesAdd[], overridesRemove[] }`
  e é reconcile atômico full-state. `computeDiff()` no calendar-editor já produz
  exatamente esse payload a partir do modelo `draft`.
- Schema REJEITA `add` (disponibilidade) whole-day (start/end null) e exige
  `slot_minutes > 0`. ACEITA `subtract` (folga) whole-day (start/end null).
- Modelo `draft`: `rulePainted` Set<"weekday:minute">, `ruleDurations`
  Record<"weekday:bandStart", slot>, `addCells` Set<"YYYY-MM-DD:minute">,
  `subtractCells` Set<"YYYY-MM-DD:minute">. STEP = 30.
- `weekdayOf(localDate, timeZone)`, `addRecurringPeriod`, `addDatePeriod`,
  `addFolgaPeriod` já existem no calendar-editor e mutam o draft corretamente
  (zone-aware, correção CR-01). Reusar em vez de recriar.
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Simplificar a grade de tempo — read-only + criar consulta por clique simples</name>
  <files>components/dashboard/agenda/calendar-time-grid.tsx</files>
  <action>
Remover da grade TODA a maquinaria de edição de disponibilidade (D-1 move a edição
para o painel), mantendo o render read-only do fundo, os blocos de consulta e a
criação de consulta por clique num slot livre+futuro.

REMOVER:
- Todo o bloco de gesto de Pointer Events: o `gestureRef`, o estado `preview`,
  `clearGesture`, `handlePointerDown`, `handlePointerEnter`, `handlePointerMove`,
  `handlePointerUp`, `handleContextMenu`, `isPreviewed`, e os wrappers
  `onPointerLeave`/`onPointerCancel` no container.
- As props `onDragSelect` e `onCellMenu` da assinatura do componente (deixam de
  existir — a grade não pinta nem abre menu de disponibilidade/folga).
- O `import` de `PaintMode`/gesto que ficar órfão; manter os imports ainda usados
  (`STEP`, `dateCellKey`, `minutesToLabel`, `CellState`, `DayColumn`, `MenuAnchor`).

MANTER e ADAPTAR a camada de fundo (faixas de 30 min): cada faixa continua sendo
um `<button>` que renderiza o `cellStateOf` (available/off/empty com as mesmas
classes de token oklch já presentes), mas agora com um `onClick` simples que
substitui a desambiguação do antigo `handlePointerUp`:
  - deriva `anchor = { x: event.clientX, y: event.clientY }`;
  - `appointment = appointmentOf?.(localDate, minute) ?? null`;
  - se há consulta e `onAppointmentSelect` → `onAppointmentSelect(appointment, anchor)`;
  - senão, se `cellStateOf === "available"` E `isCellBookable` (default true) E
    `onAppointmentCreate` → `onAppointmentCreate(localDate, minute, anchor)`;
  - senão → no-op (slot livre no passado, folga e vazio NÃO fazem nada — a grade
    não edita mais).
Atualizar o `aria-label` da faixa para refletir só visualização + agendar (remover
a menção a "botão direito para folga"): available → "disponível (clique para
agendar uma consulta)", off → "folga", empty → "vazio". Manter `aria-pressed`.

MANTER intactos: cabeçalho de dias, gutter de horas, linha de AGORA, e os BLOCOS
de consulta absolutos (incluindo `onAppointmentSelect` no clique do bloco). O
container pode dropar `style={{ touchAction: "none" }}` (só servia ao gesto) e
manter `select-none` opcional; NÃO remover o `overflow-x-auto`.

Não introduzir cores hex/rgb — reutilizar os tokens/classes já presentes.
  </action>
  <verify>
    <automated>yarn typecheck</automated>
    <automated>grep -riE "#[0-9a-f]{3,6}|rgb\(" components/dashboard/agenda/calendar-time-grid.tsx | grep -v '^#' | wc -l | grep -qx 0 || (echo "hex/rgb encontrado" && exit 1)</automated>
    <automated>grep -c "onDragSelect\|onCellMenu\|setPointerCapture\|onContextMenu" components/dashboard/agenda/calendar-time-grid.tsx | grep -qx 0 || (echo "resquicio de gesto de edicao" && exit 1)</automated>
  </verify>
  <done>
A grade compila sem `onDragSelect`/`onCellMenu`/gesto de pointer/contextmenu.
Fundo read-only e blocos de consulta preservados. Clique num slot LIVRE+futuro
chama `onAppointmentCreate`; clique numa consulta chama `onAppointmentSelect`;
folga/vazio/passado = no-op. Nenhum hex/rgb no arquivo.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Painel com toggle + availability-panel + salvar-na-hora com Desfazer no editor</name>
  <files>components/dashboard/agenda/availability-panel.tsx, components/dashboard/agenda/agenda-side-panel.tsx, components/dashboard/agenda/calendar-editor.tsx</files>
  <action>
Entregar o painel lateral único com toggle e o formulário de edição, e reconfigurar
o `calendar-editor.tsx` para salvar imediatamente (D-3), removendo o rascunho
acumulado, a toolbar e a guarda de descarte.

(A) NOVO `agenda-side-panel.tsx` (wrapper com toggle, D-1):
- `"use client"`. Segmented control no topo com dois modos: "Consulta" e
  "Disponibilidade/Folga" (copy PT-BR). Usar o padrão de botões segmentados já
  visto no projeto (dois `<button>` com `aria-pressed`, classes de token
  border-primary/bg-primary; ou `Tabs` shadcn) — sem deps novas.
- Estado local `mode: "consulta" | "disponibilidade"` (default "consulta").
- Props: repassa tudo que o `BookingRail` precisa (patients, selectedDate,
  selectedDayLongLabel, onSelectedDateChange, freeSlots) E tudo que o
  `AvailabilityPanel` precisa (ver B). Modo Consulta → `<BookingRail .../>`
  (inalterado). Modo Disponibilidade → `<AvailabilityPanel .../>`.
- Tokens oklch apenas; sem hex/rgb.

(B) NOVO `availability-panel.tsx` (formulário, D-4..D-6):
- `"use client"`. Envolto num `Card` (padrão do BookingRail). Título "Disponibilidade e folga" + subtítulo curto PT-BR.
- Reusar o mini date-picker: `Calendar` de `@/components/ui/calendar`, `mode="single"`,
  `weekStartsOn={1}`, ptBR — controlado por `selectedDate` (YYYY-MM-DD) via as mesmas
  props do BookingRail (`selectedDate`/`onSelectedDateChange`). O painel converte
  string↔Date exatamente como o BookingRail (`selectedAsDate`/`handleDayPick`).
- Controles do formulário (estado local):
  - Tipo: "Disponibilidade" | "Folga" (segmented, aria-pressed).
  - Escopo: "Período" | "Dia inteiro" | "Recorrência" (segmented, aria-pressed).
  - Início/Fim: dois selects de horário passo 30 min (00:00–24:00) — replicar o
    padrão `TimeSelect` de availability-cell-menu.tsx (reusar `minutesToLabel`,
    `STEP` de calendar-day-week-grid). Exibidos quando escopo = Período OU (Dia
    inteiro + Tipo=Disponibilidade, ver D-5) OU (Recorrência + faixa).
  - Duração de cada horário: select com presets 15/20/30/60 (reusar `SLOT_PRESETS`,
    `DEFAULT_SLOT` de availability-cell-menu.tsx) — SÓ quando Tipo=Disponibilidade.
  - Dia(s) da semana: quando Escopo=Recorrência, um grupo de 7 toggles Seg..Dom
    (segunda-first) multi-seleção (aria-pressed) → guarda um Set de weekday
    (0=dom..6=sáb). Copy dos rótulos: "Seg","Ter","Qua","Qui","Sex","Sáb","Dom".
  - Prefill (D-5): quando o médico escolhe Tipo=Disponibilidade + Escopo="Dia
    inteiro", prefill Início=08:00 Fim=18:00 slot=30 e mostrar um aviso curto PT-BR
    explicando que o dia inteiro usa uma janela padrão editável (porque add
    whole-day é rejeitado pelo schema). Deixar os selects editáveis.
  - Aviso de horizonte (D-2): quando Tipo=Folga + Escopo=Recorrência, mostrar um
    texto "Aplicada para os próximos ~6 meses." Sem literal técnico que dispare
    grep negativo.
- Validação inline: fim > início quando faixa é exigida; ao menos 1 weekday quando
  Recorrência. Botão "Aplicar" desabilitado se inválido.
- Ao clicar "Aplicar": chamar UM callback do pai `onApply(intent)` onde `intent`
  descreve a marcação de forma declarativa, por ex.:
  `{ type: "available" | "off", scope: "period" | "whole-day" | "recurring",
    date: string, startMinute: number | null, endMinute: number | null,
    slotMinutes: number, weekdays: number[] }`
  O painel NÃO fala com o backend nem com o draft — só descreve a intenção. O
  editor (C) traduz para mutações + save.
- Tokens oklch apenas; copy PT-BR; sem deps novas.

(C) `calendar-editor.tsx` — salvar-na-hora + Desfazer, remover rascunho/toolbar/guarda:
- SUBSTITUIR o `BookingRail` renderizado nas abas Dia e Semana pelo novo
  `<AgendaSidePanel .../>`, repassando as props do BookingRail JÁ EXISTENTES
  (patients, selectedRailDate, selectedRailDayLongLabel, setSelectedRailDate,
  railFreeSlots) MAIS um novo handler `onApply={applyAvailabilityIntent}` e o
  `timeZone`. O `PendingRequestsPanel` continua abaixo, na mesma coluna.
- NOVO `applyAvailabilityIntent(intent)`:
  1. Fazer snapshot do estado atual para o Desfazer: `const before = cloneDraft(draft)`.
  2. Mutar o draft conforme o intent, REUSANDO as funções existentes:
     - available + period (data) → `addDatePeriod(date, start, end)`  [D-5 Período → override add]
     - available + whole-day (data) → `addDatePeriod(date, start, end)` com a
       janela prefillada vinda do intent (D-5: prefill 08–18 editável, vira add).
     - available + recurring → para cada weekday do intent, aplicar a faixa como
       regra recorrente. Reusar `addRecurringPeriod` que já resolve por localDate;
       para aplicar num weekday específico independentemente da data escolhida,
       adicionar diretamente aos Sets `rulePainted`/`ruleDurations` do draft (mesma
       forma que `buildInitialDraft`/`addRecurringPeriod`): para `m` de start a end
       (passo STEP) `rulePainted.add(\`${weekday}:${m}\`)` e
       `ruleDurations[\`${weekday}:${start}\`] = slot`.  [D-4 Recorrência → rules]
     - off + period (data) → `addFolgaPeriod(date, start, end)`  [D-6 Período → subtract]
     - off + whole-day (data) → `addFolgaPeriod(date, dayWindowStart, dayWindowEnd)`
       cobrindo o dia; NOTA: o `computeDiff` agrupa `subtractCells` numa faixa por
       data (não emite start/end null), o que continua sendo uma folga válida no
       schema (subtract com faixa). Cobrir a janela do dia é suficiente para o
       comportamento "dia inteiro" no cliente.  [D-6 Dia inteiro → subtract]
     - off + recurring → expandir para CADA data correspondente aos weekdays do
       intent, de HOJE até +6 meses (D-2). Iterar dia a dia (usar `addDays` +
       `context`); para cada data cujo `weekdayOf(localDate, timeZone)` está no
       Set de weekdays, aplicar `addFolgaPeriod(localDate, start, end)` (período)
       ou a janela do dia (dia inteiro). Horizonte finito gerado no momento de
       aplicar (D-2).
  3. Recompute o payload completo com `computeDiff()` e chame
     `saveAvailabilityAction(diff)` (NÃO acumular rascunho).
  4. Em sucesso: `toast.success` com ação "Desfazer" (usar a API de action do
     sonner: `toast.success(msg, { action: { label: "Desfazer", onClick: () => undo(before) } })`).
     `undo(before)`: `setDraft(before)`, recomputar `computeDiff` a partir de
     `before` e re-salvar (chamar novamente `saveAvailabilityAction`) para reverter
     o estado anterior; toast de confirmação curto.
  5. Em erro: `setDraft(before)` (rollback do estado em memória) + `toast.error`
     com mensagem amigável (usar `result.error`).
  Como o `computeDiff` lê de `draft` (estado assíncrono), calcular o payload a
  partir de um draft LOCAL derivado (aplicar as mesmas mutações a `cloneDraft(before)`
  numa variável `next` e passar `next` a uma variante de computeDiff, OU chamar
  `setDraft(next)` e computar o diff a partir de `next` diretamente antes do set).
  Preferir a forma pura: construir `next` localmente, `computeDiff(next)` e
  `setDraft(next)` — refatorar `computeDiff`/`monthByDay` para aceitar um draft
  como argumento (default = state `draft`) evitando corrida.
- REMOVER: `savedDraft`, `isDirty`, o `useEffect` de `beforeunload` (~333-347), a
  toolbar Salvar/indicador "não salvo"/Descartar (~1243-1268), os botões "Limpar
  disponibilidade"/"Limpar folgas" e seus handlers (`requestClearAvailability`,
  `requestClearFolgas`, `confirmClear`, `pendingClear`, `clearAvailabilityForDates`,
  `clearFolgasForDates`, `clearScopeDates`, `clearDisabled`, `clearScopeNoun`), a
  guarda de descarte (`runGuarded`, `confirmDiscard`, `pendingAction` + o
  `AlertDialog` de descarte ~1397-1421 e o de limpeza ~1424-1445), e o
  `AvailabilityCellMenu` renderizado (~1366-1377) junto do estado `menu`,
  `handleCellMenu`, `handleMenuWholeDay`, `handleMenuPeriod`, `scope`/`setScope`.
  A navegação por aba passa a chamar `setActiveTab` direto (sem `runGuarded`); o
  Mês `onSelectDay` idem.
- MANTER: todo o mapeamento de consultas (appointmentByCell, positionedFor,
  railFreeSlots, buildCreateTarget, handleAppointmentCreate, handleAppointmentSelect),
  o `AppointmentCreateDialog`, o `AppointmentDetailMenu`, o `CalendarMonthIndicator`,
  o `minuteRows`, `cellStateOf`, `computeDiff`. Atualizar as chamadas de
  `<CalendarTimeGrid>` para NÃO passar mais `onDragSelect`/`onCellMenu` (removidos
  na Task 1); manter `onAppointmentCreate`/`onAppointmentSelect`.
- Atualizar a dica de interação (~1272-1279) para refletir só "clique num horário
  livre para agendar" e apontar que disponibilidade/folga se editam no painel.
- Tokens oklch apenas; copy PT-BR; sem deps novas.
  </action>
  <verify>
    <automated>yarn typecheck</automated>
    <automated>grep -riE "#[0-9a-f]{3,6}|rgb\(" components/dashboard/agenda/availability-panel.tsx components/dashboard/agenda/agenda-side-panel.tsx components/dashboard/agenda/calendar-editor.tsx | grep -v '^#' | wc -l | grep -qx 0 || (echo "hex/rgb encontrado" && exit 1)</automated>
    <automated>grep -c "beforeunload\|isDirty\|savedDraft\|AvailabilityCellMenu\|pendingClear\|runGuarded" components/dashboard/agenda/calendar-editor.tsx | grep -qx 0 || (echo "resquicio de rascunho/toolbar/guarda" && exit 1)</automated>
    <automated>grep -q "AgendaSidePanel" components/dashboard/agenda/calendar-editor.tsx || (echo "painel com toggle nao integrado" && exit 1)</automated>
    <automated>yarn build</automated>
  </verify>
  <done>
Painel lateral com toggle Consulta ↔ Disponibilidade/Folga integrado nas abas
Dia/Semana. Modo Disponibilidade edita disponibilidade E folga por Período, Dia
inteiro e Recorrência (D-4..D-6); Folga recorrente expande ~6 meses (D-2). Cada
Aplicar salva imediatamente via saveAvailabilityAction (D-3) com toast Desfazer;
erro faz rollback. Rascunho acumulado, toolbar Salvar/Descartar/Limpar, guarda de
descarte/beforeunload e o AvailabilityCellMenu foram removidos. `yarn typecheck` e
`yarn build` passam; nenhum hex/rgb nos arquivos tocados.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: [BLOCKING] Verificação visual humana — grade read-only + painel edita disponibilidade/folga</name>
  <action>Checkpoint de verificação visual — sem código; seguir os passos de how-to-verify.</action>
  <what-built>
Grade de tempo simplificada (só visualização + criar consulta) e painel lateral
com toggle "Consulta ↔ Disponibilidade/Folga", cujo modo Disponibilidade edita
disponibilidade E folga por Período/Dia inteiro/Recorrência salvando na hora com
Desfazer (D-1..D-6). CAMADA DE UI apenas; backend reusado.
  </what-built>
  <how-to-verify>
1. `yarn dev` e abra `/dashboard/agenda` (usuário com perfil paid).
2. GRADE (aba Dia e Semana):
   - Tente arrastar/pintar numa célula vazia → NÃO deve marcar disponibilidade.
   - Clique-direito numa célula → NÃO deve abrir menu de folga.
   - Confirme que o fundo AINDA mostra disponibilidade (azul/livre), folga e vazio,
     e que consultas aparecem como blocos.
   - Clique num horário LIVRE no FUTURO → abre "Nova consulta". Clique numa consulta
     → abre o detalhe/transição.
3. PAINEL — toggle no topo: alterne "Consulta" ↔ "Disponibilidade/Folga".
   - Consulta = trilho de agendamento (BookingRail) como antes.
4. Modo Disponibilidade/Folga — teste cada combinação e confirme que a GRADE reflete
   após salvar (toast "Desfazer" aparece):
   - Disponibilidade + Recorrência: escolha dia(s) da semana + faixa + duração →
     Aplicar → toda semana correspondente fica disponível na grade.
   - Disponibilidade + Período (escolha uma data) + faixa + duração → só naquela data.
   - Disponibilidade + Dia inteiro: confirme o prefill 08:00–18:00 editável + o aviso
     de janela padrão → Aplicar → dia disponível.
   - Folga + Período (data) + faixa → aquela faixa vira folga na grade.
   - Folga + Dia inteiro (data) → o dia inteiro vira folga.
   - Folga + Recorrência: escolha dia(s) da semana → confirme o aviso "próximos ~6
     meses" → Aplicar → folga aparece nas datas correspondentes ao longo dos meses
     (navegue Semana/Mês para conferir o alcance).
5. Clique "Desfazer" no toast → a última mudança é revertida na grade.
6. Recarregue a página (F5) → NÃO deve aparecer aviso de "mudanças não salvas"
   (não há mais rascunho/guarda); o estado salvo persiste.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva os problemas encontrados.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client (painel) → Server Action | O intent do formulário é traduzido em `{ rules, overridesAdd, overridesRemove }` e enviado ao `saveAvailabilityAction`. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kej-01 | Tampering | payload de saveAvailability recomputado no cliente | medium | accept | O backend (schema Zod + RPC atômica) NÃO muda: valida minutos múltiplos de 30, teto 1440, faixa coerente, slot para add, e re-verifica o dono via auth.uid()/profile_id server-side. O painel só recompõe o payload; qualquer intent malformado é rejeitado pelo schema com mensagem PT-BR. Nenhuma superfície nova de backend nesta tarefa (UI-only). |
| T-kej-02 | Denial of Service | Folga recorrente expandida ~6 meses (D-2) | low | accept | Horizonte FINITO (~6 meses, ~26 datas por weekday) gerado no cliente; volume de overrides limitado e dentro do que o reconcile já suporta. Sem loop ilimitado. |
| T-kej-SC | Tampering | npm/pip/cargo installs | high | mitigate | Nenhuma dependência nova é instalada (constraint). Nada a verificar. |
</threat_model>

<verification>
- `yarn typecheck` limpo.
- `yarn build` conclui.
- Grep gate `#hex`/`rgb(` = 0 nos arquivos tocados.
- Nenhum arquivo fora da camada de UI alterado (schema/expand/modules/actions/
  migrations/page.tsx inalterados) — confirmar via `git status`.
</verification>

<success_criteria>
- A grade não edita mais disponibilidade/folga (sem arraste, menu ou clique-direito),
  mas mostra o fundo read-only e cria consulta por clique.
- O painel tem toggle Consulta ↔ Disponibilidade/Folga; o formulário edita ambos por
  Período/Dia inteiro/Recorrência conforme D-4..D-6.
- Salvar imediatamente (D-3) com Desfazer; erro faz rollback; sem rascunho/guarda.
- Folga recorrente aplica ~6 meses (D-2) com sinalização na UI.
- Somente UI alterada; backend reusado.
</success_criteria>

<output>
Create `.planning/quick/260723-kej-editar-disponibilidade-e-folga-somente-p/260723-kej-SUMMARY.md` when done.
</output>

---
phase: quick-260725-dvv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/calendar-time-grid.tsx
  - components/dashboard/agenda/availability-panel.tsx
autonomous: true
requirements: [AGENDA-UX]
must_haves:
  truths:
    - "A grade Dia/Semana mostra 1 linha por HORA (rótulo em cada hora), não 2 células de 30 min."
    - "Uma consulta de 60 min ocupa a hora inteira; uma de 30 min ocupa metade da linha da hora; uma de 90 min transborda para 1,5 hora."
    - "Os botões 'Limpar disponibilidade' e 'Limpar folgas' aparecem na toolbar de navegação, escopados pela aba (Dia=dia visível, Semana=Seg–Sex, Mês=desabilitado), com AlertDialog de confirmação e persistência imediata (salvar-na-hora) + toast Desfazer."
    - "yarn typecheck, yarn build e yarn test permanecem limpos."
  artifacts:
    - "components/dashboard/agenda/calendar-editor.tsx (clearAvailabilityForDates/clearFolgasForDates/clearScopeDates + botões + AlertDialog salvar-na-hora)"
    - "components/dashboard/agenda/calendar-time-grid.tsx (grade visual por HORA + card de consulta proporcional sem piso de meia-célula)"
    - "components/dashboard/agenda/availability-panel.tsx (duração default de disponibilidade = 60 min)"
  key_links:
    - "clearAvailabilityForDates/clearFolgasForDates → persistDraft(next) → saveAvailabilityAction (mesma via de applyAvailabilityIntent, com toast Desfazer que re-salva o snapshot anterior)"
    - "CalendarTimeGrid: GRID_STEP (render, 60) desacoplado de STEP (dado, 30) — minuteRows continua em passo 30 no editor; a grade renderiza linhas de hora e blocos por porcentagem de minutos."
    - "availability-panel DEFAULT_SLOT continua compartilhado (30) — só o estado inicial de slotMinutes do painel passa a 60, sem tocar expand-availability nem a migration % 30."
---

<objective>
Restaurar os botões "Limpar disponibilidade" / "Limpar folgas" na agenda (adaptados ao modelo salvar-na-hora), converter a grade Dia/Semana para 1 linha por HORA e garantir que o card de consulta seja proporcional à duração (30min=½ hora, 60min=hora inteira, 90min=1,5 hora).

Purpose: Devolver a limpeza em lote perdida no redesign kej e trocar a grade de 30-min-por-linha por hora-por-linha com card proporcional, sem mexer no modelo de dados (STEP=30), no expand-availability puro, nem em migrations.
Output: calendar-editor.tsx (botões Limpar + AlertDialog salvar-na-hora), calendar-time-grid.tsx (grade por hora + card proporcional), availability-panel.tsx (duração default 60).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/dashboard/agenda/calendar-editor.tsx
@components/dashboard/agenda/calendar-time-grid.tsx
@components/dashboard/agenda/availability-panel.tsx
@components/dashboard/agenda/calendar-day-week-grid.tsx
@components/dashboard/agenda/appointment-status-style.ts
@lib/expand-availability.ts

# Nota de arquitetura (confirmada por leitura do código, difere do briefing):
# - O renderizador ATIVO da grade Dia/Semana é CalendarTimeGrid (calendar-time-grid.tsx),
#   que JÁ posiciona consultas como blocos absolutos por PORCENTAGEM de minutos
#   (topPct/heightPct). O antigo CalendarDayWeekGrid (célula-a-célula, isStart) é
#   CÓDIGO MORTO (só se auto-importa) — NÃO é montado pelo calendar-editor. Portanto a
#   "remoção do preenchimento célula-a-célula para consultas" já está feita no caminho vivo;
#   Task 3 só refina o bloco proporcional e não toca o componente morto.
# - STEP=30 (calendar-day-week-grid.tsx:13) é a granularidade do DADO (rules em múltiplos
#   de 30, TIME_OPTIONS de 30 em 30, exclusion constraint/migration % 30). NÃO alterar STEP.
#   A grade "por hora" é uma mudança de RENDER (GRID_STEP=60 local ao CalendarTimeGrid),
#   não de dado — a disponibilidade de 30 min já existente continua representável.
# - saveAvailabilityAction/listAppointmentsByRangeAction e a action de range (b4f3f19) estão
#   corretas: NÃO tocar. NÃO tocar lib/expand-availability.ts, migrations, DB, schema de create/transition.
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Restaurar botões Limpar (disponibilidade/folgas) adaptados ao salvar-na-hora</name>
  <files>components/dashboard/agenda/calendar-editor.tsx</files>
  <action>
    Reintroduzir a limpeza em lote de 11ecfdf, mas PERSISTINDO na hora (não há mais Salvar em lote).

    1. Adicionar o import de AlertDialog (e subcomponentes AlertDialogAction, AlertDialogCancel,
       AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
       AlertDialogTitle) de "@/components/ui/alert-dialog" — hoje NÃO está importado no arquivo
       (foi removido no redesign kej).

    2. Estado de confirmação: `const [pendingClear, setPendingClear] = React.useState<null | { title: string; apply: () => void }>(null)`.

    3. Portar clearAvailabilityForDates(localDates) e clearFolgasForDates(localDates) EXATAMENTE com a
       semântica de 11ecfdf, MAS retornando o próximo draft em vez de só chamar setDraft:
       - clearAvailabilityForDates: a partir de `cloneDraft(draft)`, remove de rulePainted todas as
         chaves cujo weekday pertence aos weekdays das localDates (weekdayOf(localDate, timeZone));
         remove as ruleDurations dos mesmos weekdays; remove de addCells todas as chaves cujo prefixo
         (até o último ":") é uma das localDates. (O template recorrente é global por weekday — limpar
         uma terça esvazia todas as terças, consequência intencional, manter o comportamento de 11ecfdf.)
       - clearFolgasForDates: a partir de `cloneDraft(draft)`, remove de subtractCells as chaves cujo
         prefixo (até o último ":") pertence ao conjunto de localDates. Não toca rulePainted nem addCells.
       Ambas devolvem o `next: Draft` computado (função pura sobre o draft atual), para poder passar a persistDraft.

    4. Persistência salvar-na-hora com undo: criar `clearAndPersist(next: Draft)` que espelha o final de
       applyAvailabilityIntent — captura `before = cloneDraft(draft)`, chama `persistDraft(next)`; em
       sucesso fecha nada (não há drawer aqui) e mostra toast.success("Disponibilidade atualizada.", { action: { label: "Desfazer", onClick: async () => { const undo = await persistDraft(before); if (undo.ok) toast.success("Mudança desfeita."); else { setDraft(next); toast.error(undo.error) } } } }); em erro faz setDraft(before) + toast.error(result.error). Reusar persistDraft/toast já existentes.

    5. Escopo pela aba (portar clearScopeDates de 11ecfdf): Dia = [localDateOf(selectedRailDateObj)]
       (a visão Dia renderiza selectedRailDateObj, não dayCursor — usar a MESMA data que a grade Dia
       mostra); Semana = weekDays.map(localDateOf); Mês = []. `clearDisabled = activeTab === "mes" ||
       clearScopeDates.length === 0`. `clearScopeNoun = activeTab === "semana" ? "da semana" : "do dia"`.

    6. requestClearAvailability()/requestClearFolgas(): se clearDisabled, return; senão setPendingClear
       com title (ex.: `Limpar toda a disponibilidade ${clearScopeNoun}?`) e apply que chama
       clearAndPersist(clearAvailabilityForDates(clearScopeDates)) ou (...clearFolgasForDates(...)).
       confirmClear(): captura pendingClear, seta pendingClear=null e chama pending.apply().

    7. UI: na barra de navegação (o div da navegação Anterior·Hoje·Próximo, ~1173-1203), adicionar
       um grupo com dois Button variant="outline" size="sm" className="h-7 px-2 text-xs" — "Limpar
       disponibilidade" e "Limpar folgas" — com onClick={requestClearAvailability}/{requestClearFolgas},
       disabled={clearDisabled} e aria-disabled={clearDisabled}. Posicionar antes do grupo "+ Nova
       marcação" (que usa lg:ml-auto), mantendo o layout flex-wrap existente.

    8. Renderizar o AlertDialog de confirmação (perto do fim do JSX, antes do </Tabs>): open={pendingClear
       !== null}, onOpenChange fecha em !open, título = pendingClear?.title, descrição PT-BR informando que
       a ação é imediata e pode ser desfeita pelo toast (ADAPTAR a copy de 11ecfdf que dizia "não salva
       nada / clique em Salvar" — AGORA é salvar-na-hora: ex.: "Esta ação é aplicada imediatamente. Você
       pode desfazer pelo aviso que aparece em seguida."), AlertDialogCancel "Cancelar" e AlertDialogAction
       "Limpar" (onClick={confirmClear}).

    Convenções: PT-BR, 2 espaços, aspas duplas, tokens (sem hex/rgb). Este é o tracer: prova a via
    completa botão → confirmação → mutação pura do draft → persistDraft/saveAvailabilityAction → toast
    Desfazer, reusando 100% da infra de salvar-na-hora já existente.
  </action>
  <verify>
    <automated>yarn typecheck</automated>
  </verify>
  <done>Botões "Limpar disponibilidade"/"Limpar folgas" na toolbar, desabilitados no Mês; ao confirmar no AlertDialog, o draft é limpo no escopo da aba, persistido via saveAvailabilityAction e um toast "Desfazer" reverte re-salvando o snapshot anterior. yarn typecheck limpo.</done>
</task>

<task type="auto">
  <name>Task 2: Grade Dia/Semana por HORA (1 linha/hora) + duração default 60</name>
  <files>components/dashboard/agenda/calendar-time-grid.tsx, components/dashboard/agenda/availability-panel.tsx</files>
  <action>
    Converter a grade VISUAL para 1 linha por hora, SEM mexer no STEP=30 do dado.

    Em calendar-time-grid.tsx:
    1. Definir uma constante local de RENDER `const GRID_STEP = 60` (passo visual da hora) — distinta do
       STEP=30 importado (que continua sendo a granularidade do dado/minuteRows). Adicionar comentário
       explicando o desacoplamento (dado em 30 min; render por hora).
    2. Fundo READ-ONLY por HORA: hoje o fundo itera `minuteRows` (passo 30) desenhando um <button> por
       faixa de 30 min. Trocar por uma iteração em passo de hora sobre a janela [windowStart, windowEnd):
       gerar as linhas de hora com `for (let m = Math.floor(windowStart/60)*60; m < windowEnd; m += GRID_STEP)`
       e, para cada hora, renderizar UM <button> de fundo com top={topPct(m)}% e height={heightPct(m, m+GRID_STEP)}%.
       O estado da célula (`cellStateOf`) e a bookability (`isCellBookable`) da HORA devem ser avaliados no
       minuto de início da hora (m) — o clique numa hora livre continua abrindo Nova consulta via
       handleBackgroundClick(event, day.localDate, m). Manter as classes agenda-avail/agenda-folga/agenda-vazio
       e o aria-label (ajustar o rótulo para a hora, ex.: minutesToLabel(m)).
       PORQUÊ pintar por hora e não por 30 min: decisão do usuário ("tudo por hora" — perde a distinção
       visual dos 30 min no FUNDO; o dado por 30 min permanece intacto e o expand continua correto).
    3. Rótulos de hora: `hourLabels` já é de hora em hora (linha ~136) — manter. A grade não usa
       gridTemplateRows fixo (é posicionamento por %), então a "altura de hora" emerge de totalMinutes;
       garantir que cada hora ocupe um bloco visível confortável — a altura da grade é dada pelo container
       flex do pai (h-full), então o resultado é proporcional. Não introduzir altura fixa em rem que quebre
       o fit-sem-scroll (260724-hdr/hv6). Se necessário para legibilidade, apenas ajustar o texto/aria, sem
       adicionar rolagem vertical.
    4. NÃO alterar handleBackgroundClick além do minuto passado; NÃO alterar a camada de blocos de consulta
       (isso é Task 3); NÃO alterar STEP nem minuteRows (continuam vindo do editor em passo 30).

    Em availability-panel.tsx:
    5. Duração default da DISPONIBILIDADE = 60: trocar o estado inicial `useState<number>(DEFAULT_SLOT)`
       (linha ~174) por `useState<number>(60)` e, no efeito de prefill "Dia inteiro" (~181-189) que hoje
       faz `setSlotMinutes(DEFAULT_SLOT)`, passar a `setSlotMinutes(60)`. 60 já está em SLOT_PRESETS
       ([15,20,30,60]) e é múltiplo de 30 → válido no banco, SEM migration. NÃO alterar DEFAULT_SLOT (é
       compartilhado com o menu antigo e com o computeDiff do editor) nem os TIME_OPTIONS (passo 30 —
       o médico ainda pode escolher 30 min pontualmente).

    NÃO tocar lib/expand-availability.ts, migrations, DB, nem o computeDiff do editor.
    Convenções: PT-BR, 2 espaços, aspas duplas, tokens oklch (sem hex/rgb).
  </action>
  <verify>
    <automated>yarn typecheck && yarn test</automated>
  </verify>
  <done>A grade Dia/Semana renderiza 1 bloco de fundo por HORA (rótulo por hora), clicável numa hora livre para agendar; a duração default do painel de disponibilidade é 60 min. yarn typecheck e yarn test (specs de expand-availability) limpos.</done>
</task>

<task type="auto">
  <name>Task 3: Card de consulta proporcional (sem piso de meia-célula), status/hachura/precedência intactos</name>
  <files>components/dashboard/agenda/calendar-time-grid.tsx</files>
  <action>
    Ajustar o bloco de consulta para altura ESTRITAMENTE proporcional à duração, agora que a linha visual é
    a hora.

    1. Na camada de blocos (positioned.filter(...).map(p), ~337-392), a altura hoje é
       `Math.max(heightPct(p.startMinute, p.endMinute), heightPct(p.startMinute, p.startMinute + STEP/2))`
       — esse piso de "meia célula de 30 min" distorce a proporção. Trocar por altura proporcional pura
       `heightPct(p.startMinute, p.endMinute)`, protegendo apenas contra durações degeneradas com um piso
       MÍNIMO pequeno e fixo (ex.: `Math.max(heightPct(p.startMinute, p.endMinute), 0.5)` em pontos
       percentuais) só para blocos clicáveis — o piso NÃO deve mais depender de STEP. Resultado alvo com
       linha = hora: 30 min ≈ meia linha, 60 min = linha inteira, 90 min = 1,5 linha (transborda), coerente
       com topPct/heightPct que já são por minuto.
    2. Manter INTACTOS: APPOINTMENT_STATUS_STYLE (style.cell/label/Icon/strike), a hachura da Cancelada
       (style.hatch → var(--agenda-canceled-hatch)), a precedência ativo>histórico já resolvida no pai
       (positionedFor/STATUS_PRECEDENCE, D-07) via z-index (p.isActive ? z-[6] : z-[3]), o clique no bloco
       (onAppointmentSelect → detalhe) e o clique numa HORA livre de fundo (Nova consulta, Task 2).
    3. Confirmar que o componente MORTO calendar-day-week-grid.tsx (célula-a-célula/isStart) NÃO é montado
       pelo caminho vivo (ele só se auto-importa) — NÃO editá-lo; nenhuma mudança de render de consulta é
       necessária lá. Se o typecheck acusar import não usado por causa de STEP/STEP/2, ajustar apenas o que
       o compilador exigir dentro de calendar-time-grid.tsx.
    4. NÃO alterar positionedFor no editor (startMinute/endMinute/columnIndex já corretos); NÃO alterar o
       mapa appointmentByCell (usado só para desambiguação de clique no fundo).

    Convenções: PT-BR, 2 espaços, aspas duplas, tokens oklch (sem hex/rgb).
  </action>
  <verify>
    <automated>yarn typecheck && yarn build</automated>
  </verify>
  <done>Cada consulta é um único bloco absolute-positioned com altura = (duração/60)×altura-da-hora: 30min ocupa metade da hora, 60min a hora inteira, 90min transborda para 1,5 hora; estilo por status, hachura da cancelada, precedência D-07 e clique (detalhe / hora livre → Nova consulta) preservados. yarn typecheck e yarn build limpos.</done>
</task>

</tasks>

<verification>
- yarn typecheck limpo (todas as tasks).
- yarn build limpo (todas as tasks; sem erros de import/JSX).
- yarn test limpo — as specs de lib/expand-availability.spec.ts continuam passando (a função pura NÃO é tocada).
- Sanidade manual (checkpoint visual do usuário, fora do escopo automatizado): grade mostra 1 linha por hora; botões Limpar aparecem escopados pela aba com confirmação + Desfazer; consulta de 60 min preenche a hora e a de 30 min preenche metade.
</verification>

<success_criteria>
- Botões "Limpar disponibilidade"/"Limpar folgas" restaurados na toolbar, escopados por aba (Dia/Semana/Mês-desabilitado), com AlertDialog e salvar-na-hora + toast Desfazer.
- Grade Dia/Semana por HORA (1 linha/hora, rótulo por hora), sem scroll vertical adicional.
- Card de consulta proporcional à duração (30/60/90 min = ½/1/1,5 linha), com status/hachura/precedência/cliques intactos.
- STEP=30 (dado), lib/expand-availability.ts, migrations e schema NÃO alterados.
- yarn typecheck + yarn build + yarn test limpos.
</success_criteria>

<output>
Create `.planning/quick/260725-dvv-agenda-restaurar-bot-es-limpar-disponibi/260725-dvv-SUMMARY.md` when done
</output>

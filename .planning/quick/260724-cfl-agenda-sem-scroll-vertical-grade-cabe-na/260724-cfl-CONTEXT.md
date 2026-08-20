# Quick Task 260724-cfl: Agenda — sem scroll vertical, dia selecionado "aba ativa", painel vira drawer — Context

**Gathered:** 2026-07-24
**Status:** Ready for planning
**Branch:** `redesign/agenda-hibrida` (continua du8 + kej + m6r)

<domain>
## Task Boundary

Três refinamentos de UI na Agenda (Fase 7), na mesma branch. CAMADA DE UI apenas — backend/actions/expand/RSC inalterados.

1. A grade do calendário NÃO pode ter scroll vertical (em nenhuma view: Dia/Semana/Mês) — deve caber na altura disponível.
2. O destaque do cabeçalho do dia selecionado precisa de um aspecto melhor (estilo "aba ativa").
3. O painel lateral direito (`AgendaSidePanel`) deixa de ser coluna fixa e vira um **drawer** que entra pela direita.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

- **C-1 (sem scroll vertical):** A grade de tempo (Dia/Semana) deve caber na ALTURA disponível sem scrollbar vertical. Trocar o `HOUR_H` fixo por layout que preenche a altura: posicionar blocos de consulta e a linha de "agora" por PORCENTAGEM do total de minutos da janela (top% / height% relativos a `windowStart..windowEnd`), e distribuir as linhas de hora com flex (`flex-1`) dentro de um container que preenche a altura. Manter apenas o `overflow-x-auto` (scroll horizontal quando muitas colunas). O Mês também deve caber na altura (sem scroll vertical). Definir uma altura de container previsível (ex.: `h-[calc(100svh - <chrome>)]` ou flex-fill do card da agenda) para ancorar o preenchimento.
- **C-2 (dia selecionado = "aba ativa"):** O cabeçalho do dia selecionado usa `bg-primary/10` + texto `text-primary` + uma barra inferior grossa `border-b-2 border-primary` (aparência de aba ativa), token-only. Deve ser DISTINTO do "hoje" (que já mostra o número em bolinha `bg-primary text-primary-foreground`). No Mês, aplicar um destaque de seleção análogo à célula (sem colidir com o "hoje").
- **C-3 (drawer pela direita):** Substituir a coluna fixa `lg:w-80` do painel por um **drawer** usando o `Sheet` já vendorizado em `components/ui/sheet.tsx` (`side="right"`), SEM dependência nova. A grade passa a ocupar a largura total. Dois botões no TOPO/toolbar abrem o drawer no modo certo:
  - **"+ Nova consulta"** → abre o drawer no modo Consulta (BookingRail).
  - **"Disponibilidade"** → abre o drawer no modo Disponibilidade/Folga (AvailabilityPanel).
  O toggle Consulta↔Disponibilidade permanece DENTRO do drawer (o botão só define o modo inicial). O drawer opera sobre o dia selecionado global (M-4 do m6r).
- **C-4 (slot livre → drawer):** Clicar num slot LIVRE+futuro na grade abre o **drawer no modo Consulta** com aquele horário PRÉ-SELECIONADO (a lista de horários do BookingRail já vem com o slot marcado). Isso APOSENTA o `AppointmentCreateDialog` modal (parar de renderizá-lo; pode manter o arquivo sem uso para evitar churn, ou remover a referência). Clicar numa consulta continua abrindo o detalhe/transição.

### Claude's Discretion
- Estratégia exata do fill de altura (medir via ResizeObserver e derivar HOUR_H vs. porcentagem + flex). PREFERIR porcentagem + flex (CSS puro, sem medição/JS), pois é robusto e evita reflow.
- Onde ancorar a altura do container (card da agenda com `min-h-0 flex-1` sob um wrapper de altura de viewport). Garantir que Dia/Semana/Mês não introduzam scroll vertical próprio.
- Forma da prop de horário pré-selecionado passada ao BookingRail (ex.: `preselectedMinute`/`preselectedStartsAt`) e como o drawer sincroniza modo aberto (estado no editor).
- Micro-cópia PT-BR dos botões e do header do drawer.
</decisions>

<canonical_refs>
## Canonical References

- `components/dashboard/agenda/calendar-time-grid.tsx` — hoje `HOUR_H=54`, `bodyHeight=(totalMinutes/60)*HOUR_H`, wrapper `overflow-x-auto`; blocos e "agora" posicionados por `topOf(minute)`/height em px → migrar para %/flex (C-1). Cabeçalho do dia (clique já existe via `onSelectDay`, m6r) recebe o estilo "aba ativa" (C-2).
- `components/dashboard/agenda/calendar-month-indicator.tsx` — caber na altura (C-1) + destaque de seleção (C-2).
- `components/ui/sheet.tsx` — primitivo do drawer (side="right"). REUSAR.
- `components/dashboard/agenda/calendar-editor.tsx` — hoje renderiza `AgendaSidePanel` numa coluna `lg:w-80 lg:shrink-0` (linhas ~1122/1139, ~1156/1173) e o `AppointmentCreateDialog`. Trocar por: grade full-width + `Sheet` (drawer) hospedando o `AgendaSidePanel`; 2 botões de trigger; estado `drawerOpen`/`drawerMode`; slot-click abre drawer em Consulta com horário pré-selecionado (C-4); aposentar o dialog modal.
- `components/dashboard/agenda/agenda-side-panel.tsx` — vira o conteúdo do drawer (mantém o toggle interno; recebe o modo inicial).
- `components/dashboard/agenda/booking-rail.tsx` — aceitar horário pré-selecionado (C-4) para marcar o slot na lista.
- `components/dashboard/agenda/appointment-create-dialog.tsx` — deixa de ser renderizado (C-4).
- NÃO alterar: lib/**, actions/**, modules/**, supabase/migrations/**, app/dashboard/agenda/page.tsx.
</canonical_refs>

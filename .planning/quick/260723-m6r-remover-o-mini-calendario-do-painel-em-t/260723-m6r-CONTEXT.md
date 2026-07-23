# Quick Task 260723-m6r: Remover mini calendário — seleção de dia no calendário real — Context

**Gathered:** 2026-07-23
**Status:** Ready for planning
**Branch:** `redesign/agenda-hibrida` (continua os quicks 260723-du8 e 260723-kej)

<domain>
## Task Boundary

O painel lateral direito tem hoje um **mini calendário (date-picker react-day-picker)** em dois modos: no `booking-rail.tsx` (Consulta) e no `availability-panel.tsx` (Disponibilidade/Folga). REMOVER esse mini calendário de TODOS os modos. A escolha do dia passa a acontecer **clicando no calendário real** (a grade principal / Mês); o painel apenas reflete o **dia selecionado** e oferece os controles de período/duração/tipo/escopo.

Camada de UI apenas. Backend, actions, expandAvailability e o RSC não mudam.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

- **M-1 (afford. de seleção):** Selecionar o dia = **clicar no cabeçalho do dia** (o rótulo "qui 23" no topo da coluna) na visão **Semana**; **clicar na célula do dia** na visão **Mês**; na visão **Dia**, o dia exibido É o dia selecionado (navegação prev/próximo já muda o dia). Clicar num SLOT LIVRE continua criando consulta (inalterado) — a seleção de dia é só via cabeçalho/célula.
- **M-2 (destaque):** O dia selecionado fica **destacado** no calendário (cabeçalho/coluna na Semana; célula no Mês), com tratamento token-only (ex.: anel/realce `ring-primary`/`bg-primary/5`), distinto do destaque de "hoje".
- **M-3 (default):** Dia selecionado inicial = **hoje** (no fuso da clínica). Em Semana/Mês, se hoje não estiver na janela visível, cair no primeiro dia útil visível.
- **M-4 (um dia compartilhado):** Existe UM `selectedDate` compartilhado que dirige os dois modos do painel (Consulta e Disponibilidade/Folga). Trocar de aba/modo mantém o mesmo dia.
- **M-5 (painel sem picker):** `booking-rail.tsx` e `availability-panel.tsx` **não renderizam mais** o `Calendar`/mini date-picker. Eles exibem o rótulo longo do dia selecionado (ex.: "quinta-feira, 23 de julho") e operam sobre ele. Para o escopo **Recorrência** (disponibilidade/folga), o dia selecionado apenas pré-seleciona o weekday correspondente; a multi-seleção de dias da semana continua no painel.

### Claude's Discretion
- Nome/forma exata da prop (`onSelectDay(localDate)` na grade e no Mês → `setSelectedRailDate` no editor).
- Se o cabeçalho do dia vira `<button>` acessível (aria-pressed no dia selecionado) — preferir sim.
- Micro-cópia PT-BR.
</decisions>

<canonical_refs>
## Canonical References

- `components/dashboard/agenda/calendar-time-grid.tsx` — cabeçalho de dias (tornar clicável → onSelectDay; destacar selecionado); Dia = dia exibido.
- `components/dashboard/agenda/calendar-month-indicator.tsx` — célula do dia clicável → onSelectDay; destacar selecionado.
- `components/dashboard/agenda/booking-rail.tsx` — REMOVER o Calendar/mini picker; manter label do dia + free slots + patient + duração.
- `components/dashboard/agenda/availability-panel.tsx` — REMOVER o Calendar/mini picker; usar o dia selecionado; Recorrência pré-seleciona o weekday.
- `components/dashboard/agenda/agenda-side-panel.tsx` — repassa selectedDate/label aos dois modos.
- `components/dashboard/agenda/calendar-editor.tsx` — `selectedRailDate` vira o dia selecionado global; wire onSelectDay da grade + Mês; default hoje (M-3); remover plumbing de date-change do picker que ficar órfão.
- NÃO alterar: lib/**, actions/**, modules/**, supabase/migrations/**, app/dashboard/agenda/page.tsx.
</canonical_refs>

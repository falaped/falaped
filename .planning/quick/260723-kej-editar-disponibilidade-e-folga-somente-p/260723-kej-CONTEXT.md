# Quick Task 260723-kej: Editar disponibilidade/folga só pelo painel lateral — Context

**Gathered:** 2026-07-23
**Status:** Ready for planning
**Branch:** `redesign/agenda-hibrida` (continua o quick 260723-du8, já aprovado)

<domain>
## Task Boundary

Mudar o modelo de interação da Agenda (Fase 7, já redesenhada no du8):

- **Calendário (grade de tempo Dia/Semana + Mês):** vira SOMENTE visualização + marcação de consultas. Continua RENDERIZANDO disponibilidade/folga como fundo read-only (livre vs folga vs vazio) e as consultas como blocos. Mantém: clicar num horário LIVRE+futuro → criar consulta; menu de detalhe/transição da consulta. REMOVE todos os gestos de EDIÇÃO de disponibilidade: arrastar para pintar, clique esquerdo em vazio abrindo menu de disponibilidade, clique direito para folga, e o `AvailabilityCellMenu` disparado pela grade.
- **Painel lateral:** passa a ser o ÚNICO lugar de editar disponibilidade e folga. O médico escolhe um dia e marca disponibilidade OU folga por **período**, **dia inteiro** ou **recorrência** — para AMBOS (folga e disponibilidade).

Camada de UI apenas. O backend de disponibilidade (schema Zod, `saveAvailability` RPC, `expandAvailability`) é REUSADO sem alteração — só muda o "canvas" de entrada (grid-paint → formulário no painel).
</domain>

<decisions>
## Implementation Decisions (LOCKED — não revisitar)

### Layout do painel
- **D-1:** Painel lateral único com **toggle no topo**: "Consulta" ↔ "Disponibilidade/Folga". Modo Consulta = o `booking-rail.tsx` atual (agendamento Calendly). Modo Disponibilidade = novo formulário de edição de disponibilidade/folga. O médico agenda no modo padrão e troca para editar disponibilidade quando precisa.

### Folga recorrente
- **D-2:** Folga recorrente NÃO é nativa no backend (só disponibilidade tem recorrência via regra semanal). Aplicar como **horizonte fixo (~6 meses)**: expandir a folga recorrente escolhida (dia(s) da semana + período OU dia inteiro) em **folgas por data** (overrides `subtract`) para cada data correspondente de hoje até ~6 meses à frente. Regeneração rolling além de 6 meses exige lógica de servidor (fora do escopo UI) — gerar o horizonte finito no momento de aplicar e sinalizar isso na UI.

### Salvar
- **D-3:** **Salvar imediatamente** cada marcação (aplica a mudança ao estado em memória + chama `saveAvailability` com o payload completo recomputado; toast de sucesso com "Desfazer" que reverte a última mudança; em erro, rollback + toast). SEM rascunho acumulado, SEM guarda de descarte/`beforeunload`, SEM toolbar "Salvar/Descartar".

### Semântica período/dia-inteiro/recorrência (mapeamento ao backend)
- **D-4:** **Disponibilidade > Recorrência** → regra semanal (`rules`: weekday + start/end + slot_minutes). Recorrência verdadeira/infinita (nativa).
- **D-5:** **Disponibilidade > Período (data específica)** → override `add` na data (faixa + slot_minutes). **Disponibilidade > Dia inteiro (data específica)** → override `add` com uma **janela de trabalho padrão ajustável** (default 08:00–18:00, slot 30 min) porque o schema REJEITA `add` whole-day (start/end null) — prefill a faixa e deixar o médico editar antes de aplicar.
- **D-6:** **Folga > Período (data)** → override `subtract` com faixa na data. **Folga > Dia inteiro (data)** → override `subtract` whole-day (start=null, end=null). **Folga > Recorrência** → expandir em `subtract` por data no horizonte de ~6 meses (D-2).

### Claude's Discretion
- Onde vive o novo formulário (componente `availability-panel.tsx` hospedado por um wrapper com o toggle, OU dentro do host). Reaproveitar padrões do `availability-cell-menu.tsx` (selects de horário, escopo, duração) e o `computeDiff`/`saveAvailability` do `calendar-editor.tsx`.
- Simplificar a grade: sem os gestos de pintura, a grade pode usar `onClick` simples no slot livre (não precisa mais de pointer-capture/drag para criar consulta).
- Micro-cópia PT-BR (mas seguir o tom/verbos do 07-UI-SPEC e do mockup).
</decisions>

<specifics>
## Specific Ideas

- Reusar o mini date-picker já existente no `booking-rail.tsx` (react-day-picker `weekStartsOn:1`, ptBR) para "escolher o dia" no modo Disponibilidade.
- Tokens oklch apenas (sem hex/rgb); cópia PT-BR.
- Sem dependências novas; primitivos shadcn já vendorizados.
</specifics>

<canonical_refs>
## Canonical References

- `lib/schemas/availability.ts` (37–200) — Zod: `rules`, `overridesAdd` (add/subtract, whole-day XOR range, add exige slot), `overridesRemove`.
- `lib/expand-availability.ts` (20–272) — tipos de entrada (bands/overrides) + FreeSlot; precedência híbrida D-21 (folga vence); wall-clock DST-safe.
- `supabase/migrations/20260722100000_save_availability_rpc.sql` — contrato atômico do save (não alterar).
- `components/dashboard/agenda/calendar-editor.tsx` (165–174 draft; 675–723 mutações; 907–972 computeDiff) — modelo draft→save REUSÁVEL.
- `components/dashboard/agenda/availability-cell-menu.tsx` (90–280) — selects de período/escopo/duração a reaproveitar no painel.
- `components/dashboard/agenda/calendar-time-grid.tsx` — grade a simplificar (remover gestos de edição, manter visual + criar consulta).
- `components/dashboard/agenda/booking-rail.tsx` (57–353) — modo Consulta + mini date-picker.
</canonical_refs>

---
phase: 06-disponibilidade-calend-rio-do-m-dico
plan: 03
subsystem: ui
tags: [calendar, availability, react, nextjs, pointer-events, radix-context-menu, timezone, server-actions]

# Dependency graph
requires:
  - phase: 06-01
    provides: expandAvailability híbrida DST-safe (rules+overrides, precedência D-21) + schema Zod endurecido (WR-02/WR-03) + migração híbrida ALTER+backfill
  - phase: 06-02
    provides: módulos CRUD de override owner-scoped (listAvailabilityOverrides) + saveAvailabilityAction (batch save reconciliando grade + overrides)
provides:
  - Calendário único editável em /dashboard/agenda (dia/semana/mês) substituindo a UI read-only v1
  - Interação por menu de contexto ancorado no cursor (esq = disponibilidade, dir = folga) com escopo recorrente vs. só-nesta-data
  - Pintura por clique/arraste (Pointer Events) e dia-inteiro, passo 30 min, janela 06–18 default (dias úteis)
  - Batch save com estado não-salvo visível + guarda de descarte (beforeunload + confirm nos pontos de saída)
  - Re-expansão client-side dos slots na navegação (fn pura no browser sobre rules+overrides crus)
  - Botões "Limpar disponibilidade" / "Limpar folgas" escopados por view (Dia/Semana)
affects: [Phase 7 (APPT — consultas escrevem por cima da disponibilidade), verify-work, secure-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Menu de contexto cursor-anchored via Radix ContextMenu (shadcn) para escolher ação/escopo sem painel lateral"
    - "Draft/dirty local no client component + diff {rules, overridesAdd, overridesRemove} enviado ao action; cliente é só UX, servidor re-valida"
    - "Re-expansão client-side com a fn pura serializável (expandAvailability roda no browser na navegação)"
    - "Janela visível dirigida pela disponibilidade (folgas não alargam a grade) com default 06–18 dias úteis"

key-files:
  created:
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/calendar-day-week-grid.tsx
    - components/dashboard/agenda/calendar-month-indicator.tsx
    - components/dashboard/agenda/availability-cell-menu.tsx
    - components/ui/context-menu.tsx
  modified:
    - app/dashboard/agenda/page.tsx

key-decisions:
  - "Modelo de interação trocado (com aprovação do usuário): toggle Disponibilidade|Folga + click/drag puro (D-15/D-16) → menu de contexto ancorado no cursor (esq = disponibilidade, dir = folga) via Popover/ContextMenu"
  - "Painel de ações lateral removido em favor de uma toolbar slim no topo (nav anterior/hoje/próximo + Salvar + indicador não-salvo)"
  - "Janela visível 06–18 default e fins de semana ocultos (Seg–Sex); a janela é dirigida pela disponibilidade — folgas não a alargam"
  - "Folga renderizada como cinza-claro plano (sem hachura), NUNCA destructive-red (mantém a intenção neutra de D-15)"
  - "Botões Limpar disponibilidade / Limpar folgas escopados por view (draft-based, com confirmação), desabilitados no Mês"

patterns-established:
  - "Cursor-anchored context menu para escolher ação + escopo de edição no calendário"
  - "Batch-save com guarda de descarte (beforeunload + confirm) como padrão de edição em lote"

requirements-completed: [AGENDA-01, AGENDA-02, AGENDA-03, AGENDA-04, AGENDA-05]

coverage:
  - id: D1
    description: "RSC /dashboard/agenda carrega rules+overrides scoped por profile_id, expande a semana no fuso da clínica e monta CalendarEditor com paid gate preservado (T-06-05/T-06-01)"
    requirement: "AGENDA-04"
    verification:
      - kind: unit
        ref: "lib/expand-availability.spec.ts (fn pura de expansão — 542 testes verdes)"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint Task 3 passo 1-2,10 — layout, navegação entre meses, viradas/fuso"
        status: pass
    human_judgment: true
    rationale: "Correção visual das viradas/fuso e layout exige olho humano; aprovado no checkpoint"
  - id: D2
    description: "Interação de edição por menu de contexto (esq=disponibilidade [dia inteiro | período início/fim/duração; escopo recorrente vs. só-nesta-data], dir=folga [dia inteiro | período]) + pintura clique/arraste dia-inteiro, passo 30 min"
    requirement: "AGENDA-01"
    verification:
      - kind: manual_procedural
        ref: "checkpoint Task 3 passo 3-4 — toggle/ação, pintura clique/arraste/dia-inteiro"
        status: pass
    human_judgment: true
    rationale: "Ergonomia da pintura e do menu de contexto é julgamento humano; aprovado no checkpoint"
  - id: D3
    description: "Batch save com estado não-salvo visível + guarda de descarte (beforeunload + confirm) persistindo o diff via saveAvailabilityAction; persistência confirmada em reload"
    requirement: "AGENDA-02"
    verification:
      - kind: manual_procedural
        ref: "checkpoint Task 3 passo 5-6 — salvar em lote + guarda de descarte + reload"
        status: pass
    human_judgment: true
    rationale: "Fluxo de salvar/descartar e persistência verificados manualmente; aprovado no checkpoint"
  - id: D4
    description: "Override aditivo pontual (AGENDA-05) soma slot extra fora do template; folga subtrativa vence a disponibilidade na mesma faixa (D-21)"
    requirement: "AGENDA-05"
    verification:
      - kind: unit
        ref: "lib/expand-availability.spec.ts (precedência híbrida D-21 — aditivo soma, folga vence)"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint Task 3 passo 7-8 — aditivo aparece, folga vence"
        status: pass
    human_judgment: false
  - id: D5
    description: "Mês = indicador (ponto + contagem de livres por dia derivados de byDay), sem pintura no mês (D-18); Limpar disponibilidade/folgas escopado por view"
    requirement: "AGENDA-03"
    verification:
      - kind: manual_procedural
        ref: "checkpoint Task 3 passo 9 — mês indicador sem pintura"
        status: pass
    human_judgment: true
    rationale: "Leitura visual do indicador de mês é julgamento humano; aprovado no checkpoint"

# Metrics
duration: ~2h (span 2 sessões: build 2026-07-21 + ajustes de checkpoint 2026-07-22)
completed: 2026-07-22
status: complete
---

# Phase 6 Plan 3: Calendário Único Editável Summary

**Calendário único editável em /dashboard/agenda (dia/semana/mês) com edição por menu de contexto ancorado no cursor (esq = disponibilidade, dir = folga), pintura clique/arraste/dia-inteiro em passo de 30 min, batch save com guarda de descarte e re-expansão client-side dos slots — substituindo a UI read-only v1.**

## Performance

- **Duration:** ~2h (dois spans: build inicial 2026-07-21, ajustes pós-checkpoint 2026-07-22)
- **Started:** 2026-07-21T16:24:32-03:00
- **Completed:** 2026-07-22T13:38:26-03:00
- **Tasks:** 3 (2 auto + 1 checkpoint humano APROVADO)
- **Files modified:** 9 (5 criados, 1 modificado, 3 removidos)

## Accomplishments
- Migração da rota RSC `app/dashboard/agenda/page.tsx`: passou a carregar `rules` + `overrides` scoped por `profile_id`, expandir a semana default no fuso da clínica (segunda como início, meio-aberto) e montar o `CalendarEditor`, preservando o paid gate no RSC e o auth redirect.
- `CalendarEditor`: superfície única editável com estado draft/dirty local, diff `{rules, overridesAdd, overridesRemove}` enviado ao `saveAvailabilityAction`, re-expansão client-side na navegação via `expandAvailability` (fn pura), e guarda de descarte (`beforeunload` + confirm nos pontos de saída conhecidos).
- Interação por menu de contexto cursor-anchored (esq = Disponibilidade [Dia inteiro | Período com início/fim/duração; escopo Recorrente vs. Só nesta data/AGENDA-05], dir = Folga [Dia inteiro | Período]), com múltiplas faixas por dia e drag-to-select por Pointer Events.
- Toolbar slim no topo (navegação anterior/hoje/próximo entre meses + Salvar + indicador não-salvo) substituindo o painel de ações lateral.
- Grid com janela visível 06–18 default e fins de semana ocultos (Seg–Sex), com a janela dirigida pela disponibilidade (folgas não a alargam); folga renderizada como cinza-claro plano, nunca destructive-red.
- Botões "Limpar disponibilidade" / "Limpar folgas" escopados por view (Dia/Semana; desabilitados no Mês), draft-based com diálogo de confirmação.
- Mês como indicador (ponto + contagem de livres por dia via `byDay`), sem pintura no mês (D-18).
- Componentes read-only v1 removidos (`agenda-view.tsx`, `availability-grid.tsx`, `exception-dialog.tsx`).

## Task Commits

1. **Task 1: RSC page.tsx — carregar overrides, expandir a semana** - `54da4e4` (feat)
2. **Task 2: CalendarEditor + subcomponentes (build inicial)** - `69dc5ed` (feat)
3. **Task 3: Verificação visual/interação (checkpoint APROVADO — ajustes solicitados aplicados):**
   - `7de019a` (feat) — default 06–18 hours + esconder fins de semana
   - `42605e3` (fix) — janela visível dirigida pela disponibilidade (folgas não alargam)
   - `bd04bd2` (feat) — shadcn context-menu component (radix-ui)
   - `0b17759` (feat) — rework da interação da grade (drag fix + context menus)
   - `a4ad801` (feat) — rework toolbar/layout + remoção do painel de ações
   - `cd9a42d` (feat) — folga como cinza-claro plano (remove hachura)
   - `11ecfdf` (feat) — botões Limpar disponibilidade / Limpar folgas escopados por view

## Files Created/Modified
- `app/dashboard/agenda/page.tsx` (MODIFICADO) — RSC: carrega rules+overrides scoped, expande a semana, monta `CalendarEditor` com paid gate + auth redirect.
- `components/dashboard/agenda/calendar-editor.tsx` (NOVO) — superfície única editável (draft/dirty, diff → saveAvailabilityAction, re-expansão client-side, guarda de descarte, toolbar, botões de limpar).
- `components/dashboard/agenda/calendar-day-week-grid.tsx` (NOVO) — grid CSS custom (coluna/dia, linha/30 min), pintura clique/arraste (Pointer Events) + dia inteiro, janela 06–18 dias úteis.
- `components/dashboard/agenda/availability-cell-menu.tsx` (NOVO) — menu de contexto ancorado no cursor: esq = Disponibilidade (dia inteiro | período; escopo recorrente vs. só-nesta-data), dir = Folga (dia inteiro | período).
- `components/dashboard/agenda/calendar-month-indicator.tsx` (NOVO) — aba Mês indicador (ponto + contagem por dia via byDay), sem pintura.
- `components/ui/context-menu.tsx` (NOVO) — primitivo shadcn ContextMenu sobre radix-ui.
- (removidos) `components/dashboard/agenda/agenda-view.tsx`, `availability-grid.tsx`, `exception-dialog.tsx` — UI read-only v1 órfã.

## Decisions Made
- **Modelo de interação (aprovado pelo usuário no checkpoint):** o toggle Disponibilidade|Folga + click/drag puro previstos em D-15/D-16 foram substituídos por um **menu de contexto ancorado no cursor** (esquerdo = disponibilidade, direito = folga) via Popover/ContextMenu, com escolha explícita de escopo (Recorrente vs. Só nesta data — cobre o override aditivo AGENDA-05). Motivo: o médico achou o modelo de toggle+pintura ambíguo para expressar "dia inteiro vs. período" e "recorrente vs. pontual" numa única gesto.
- **Painel de ações lateral removido** em favor de uma toolbar slim no topo (nav + Salvar + indicador não-salvo). O `availability-action-panel.tsx` previsto no plano não foi criado como artefato final.
- **Janela visível 06–18 e fins de semana ocultos (Seg–Sex)** como default sensato pediátrico, com a janela dirigida pela disponibilidade (folgas deixaram de alargar a grade — evita colunas/linhas vazias artificiais).
- **Folga = cinza-claro plano** (sem hachura), mantendo a intenção neutra de D-15 (nunca destructive-red).
- **Limpar disponibilidade / Limpar folgas** escopados por view, draft-based com confirmação — atalho de edição em massa que respeita o batch save + guarda.

## Deviations from Plan

### Interação/Layout re-desenhados no checkpoint (D-15/D-16 supersedidos com aprovação)

**1. [Checkpoint — decisão do usuário] Toggle + click/drag → menu de contexto cursor-anchored**
- **Found during:** Task 3 (checkpoint visual/interação)
- **Issue:** O contrato de UI D-15 (toggle único Disponibilidade|Folga) + D-16 (pintura por clique/arraste pura) não expressava bem "dia inteiro vs. período" nem "recorrente vs. só-nesta-data" num gesto só.
- **Fix:** Substituído (com aprovação explícita "aprovado") por menu de contexto ancorado no cursor — esquerdo = Disponibilidade (dia inteiro | período com início/fim/duração; escopo Recorrente vs. Só nesta data), direito = Folga (dia inteiro | período). O drag-to-select foi mantido como enhancement e corrigido.
- **Files modified:** calendar-editor.tsx, calendar-day-week-grid.tsx, availability-cell-menu.tsx, components/ui/context-menu.tsx
- **Verification:** Checkpoint humano APROVADO; yarn build + yarn test verdes.
- **Committed in:** bd04bd2, 0b17759, a4ad801

**2. [Checkpoint — decisão do usuário] Painel de ações lateral → toolbar slim no topo**
- **Found during:** Task 3
- **Issue:** O `availability-action-panel.tsx` (painel direito) previsto tornou-se redundante com o menu de contexto.
- **Fix:** Removido; navegação + Salvar + indicador não-salvo movidos para uma toolbar slim no topo. Botões de limpar por view adicionados.
- **Files modified:** calendar-editor.tsx (o artefato `availability-action-panel.tsx` não foi criado)
- **Verification:** Checkpoint humano APROVADO.
- **Committed in:** a4ad801, 11ecfdf

**3. [Ajuste visual — checkpoint] Janela 06–18 dias úteis + folga cinza-claro plano**
- **Found during:** Task 3
- **Issue:** Janela padrão muito larga (00–24 e fins de semana) e folga com hachura visualmente pesada.
- **Fix:** Default 06–18, fins de semana ocultos, janela dirigida pela disponibilidade; folga como cinza-claro plano.
- **Files modified:** calendar-day-week-grid.tsx, calendar-editor.tsx
- **Verification:** Checkpoint humano APROVADO.
- **Committed in:** 7de019a, 42605e3, cd9a42d

---

**Total deviations:** 3 grupos de ajuste, todos APROVADOS pelo usuário no checkpoint da Task 3.
**Impact on plan:** As decisões D-15/D-16 (toggle + click/drag) foram supersedidas com aprovação explícita por um modelo de menu de contexto mais expressivo; os requisitos funcionais AGENDA-01..05 e as decisões de dados (D-19..D-22) permanecem íntegros. Sem scope creep — o comportamento entregue cobre integralmente os critérios de sucesso SC-1..SC-5.

## Issues Encountered
- Nota de artefatos: o plano previa `availability-action-panel.tsx`; substituído por toolbar + menu de contexto durante o checkpoint (documentado acima). Nenhum bloqueio.

## Known Stubs
None — todos os caminhos ligados a dados reais (rules+overrides do RSC, saveAvailabilityAction, expandAvailability).

## Threat Flags
None — nenhuma nova superfície de ataque. Dado é do próprio médico dono, scoped por `profile_id`; paid gate preservado no RSC (T-06-05); o cliente não é fonte de verdade (T-06-04, action re-valida server-side).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Fase 6 completa: modelo híbrido (06-01) + CRUD/batch action (06-02) + calendário único editável (06-03) entregues e verdes (yarn build + yarn test: 542 testes, 0 falhas).
- Pronto para Phase 7 (APPT): as consultas escreverão POR CIMA da disponibilidade expandida; a exclusion constraint btree_gist é forward constraint (não adicionada agora).

---
*Phase: 06-disponibilidade-calend-rio-do-m-dico*
*Completed: 2026-07-22*

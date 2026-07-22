# Phase 7: Consultas & Ciclo de Status - Discussion Log

> **Audit trail only.** Não usar como entrada para research/planejamento/execução. A fonte de decisões é o CONTEXT.md.

**Date:** 2026-07-22 · **Mode:** discuss (default)

## Áreas discutidas (todas as 4 selecionadas)

**1. Duração & vínculo com o slot** — Opções: **1 slot da grade, só em horário livre** / duração livre só em horário livre / duração livre podendo forçar fora. Escolha: **1 slot da grade, só em horário livre**. → D-01/D-02.

**2. Fluxo de criação na agenda** — Opções: **clicar num slot livre → dialog** / botão + form separado / ambos. Escolha: **clicar no slot livre → dialog** (busca paciente no domínio existente). → D-03/D-04.

**3. Status inicial & transições** — Opções: **médico cria já Confirmada (+ confirma/recusa pendentes)** / médico escolhe Confirmada|Pedido / tudo entra como Pedido. Escolha: **cria já Confirmada; confirma/recusa pendentes**. → D-05/D-06.

**4. Recusar & reabrir** — Opções: **recusar = Cancelada (libera); realizada/falta/cancelada finais** / permite reabrir. Escolha: **recusar = Cancelada; estados finais; só pendente+confirmada seguram o horário (exclusion)**. → D-06/D-07/D-08.

## Deferido
- Duração livre / consulta multi-slot; encaixe fora da disponibilidade; reabrir cancelada/falta; notificações.

## Discrição do research/planner
- Nome da tabela/colunas; status enum vs text+CHECK; implementação do exclusion (btree_gist + tstzrange, predicado parcial por status) — greenfield no repo; render das consultas sobre o calendário; mapeamento 23P01 → PT-BR.

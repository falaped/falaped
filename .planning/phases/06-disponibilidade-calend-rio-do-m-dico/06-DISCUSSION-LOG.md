# Phase 6: Disponibilidade & Calendário do Médico - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents. A fonte de decisões é o CONTEXT.md.

## v2 Redesign — 2026-07-21 (mode: discuss)

**Trigger:** durante o UAT da v1, o médico redefiniu a tela; replan solicitado. A v1 (grade recorrente separada + views read-only, exceções só subtrativas) foi entregue e está no banco. O médico quer **um calendário único editável**.

### Decisões travadas antes deste discuss (na conversa de UAT)

| Decisão | Escolha |
|---------|---------|
| Recorrência | **Híbrido** — template recorrente + overrides por data (aditivos e subtrativos) |
| Alternância dispo/folga | **Toggle único** Disponibilidade (verde) \| Folga |
| Salvamento | **Botão Salvar em lote** |
| Layout | Abas Dia/Semana/Mês à esquerda, painel de ações à direita, navegação entre meses |
| Interação | Clique = slot; arrastar = período; controle "dia inteiro"; verde = disponível |

### Áreas discutidas neste discuss-phase

**1. Migração dos dados da v1** — Opções: Recomeçar limpo / **Preservar e migrar**. Escolha: **Preservar e migrar** (ALTER + tabela/coluna de overrides, preservando rules/folgas). → D-22.

**2. Aba Mês** — Opções: **Só indicador (edita em Dia/Semana)** / Clicar no dia pinta o dia inteiro. Escolha: **Só indicador**; edição em Dia/Semana. → D-18.

**3. Sair com mudanças não salvas** — Opções: **Confirmar antes de descartar** / Salvar automático / Perder sem avisar. Escolha: **Confirmar antes de descartar**; estado "não salvo" visível. → D-17.

**4. Registrar AGENDA-05 (aditivo por data)** — Opções: **Sim** / Não. Escolha: **Sim** — AGENDA-05 adicionado ao REQUIREMENTS.md. → D-23.

### Deferido
- Arraste multi-dia no Mês; undo/redo da pintura; no-double-booking/consultas (Phase 7).

### Discrição do planner/UI-spec
- Expansão na navegação: cliente (preferido) vs. servidor por janela.
- Mecânica exata do arraste, range de horas visível, densidade, rótulos.
- Forma do schema de overrides (tabela nova vs. coluna de tipo) e assinatura da `expandAvailability` v2.

---

## v1 (original) — 2026-07-20

Discussão original que produziu D-01..D-13 (grade recorrente + views read-only + exceções subtrativas). Superseded pelo redesign v2 acima (ver CONTEXT.md § SUPERSEDED). Mantido como histórico.

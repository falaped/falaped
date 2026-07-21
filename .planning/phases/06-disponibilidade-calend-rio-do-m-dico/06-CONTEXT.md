# Phase 6: Disponibilidade & Calendário do Médico - Context

**Gathered:** 2026-07-20 (v1) · **Redesign (v2):** 2026-07-21
**Status:** Ready for planning (v2 redesign — replaces v1 UX)

> **Nota de redesign (v2).** A v1 desta fase FOI entregue e está no banco (grade recorrente separada + views read-only dia/semana/mês, exceções só subtrativas). Durante o UAT o médico redefiniu a tela: quer **um calendário único editável** com pintura por clique/arraste, toggle Disponibilidade/Folga e salvar em lote. Este CONTEXT reflete o **redesign v2**. As decisões v1 marcadas `[SUPERSEDED]` abaixo não valem mais; as demais (fuso, meio-aberto, função pura, owner-scoped) continuam.

<domain>
## Phase Boundary

O médico gerencia sua disponibilidade e vê o calendário em **dia / semana / mês** (fuso fixo America/Sao_Paulo) numa **única superfície de calendário editável**. Ele **pinta** disponibilidade (verde) e folgas diretamente no calendário — clicando um slot, arrastando um período, ou marcando o dia inteiro — e **salva em lote**. A disponibilidade é **híbrida**: um template recorrente por dia da semana como base + **overrides por data** (aditivos E subtrativos) que sobrescrevem a semana. Os **slots livres continuam expandidos na leitura** por função pura testável — nenhuma row por slot é persistida.

**Entrega esta fase (AGENDA-01..05):** calendário único editável (dia/semana/mês), pintura clique/arraste/dia-inteiro, toggle disponibilidade|folga, salvar em lote com confirmação de descarte, template recorrente + overrides por data (aditivo/subtrativo), expansão pura de slots correta nas viradas e no fuso.

**NÃO entrega (fases seguintes / fora de escopo):**
- Consultas, ligação a paciente, ciclo de status, no-double-booking → **Phase 7** (APPT-*).
- Acesso delegado / assento da assistente → **Phase 8/9** (SEAT-*).
- Livro-caixa → **Phase 10** (EARN-*). Notificações → fora do milestone.
- **Zero nova superfície externa de ataque** — tudo é do próprio médico dono, escopado por `profile_id`.

</domain>

<decisions>
## Implementation Decisions

### Superfície: calendário único editável
- **D-14 (v2):** A tela é **um calendário só** com **abas Dia / Semana / Mês à esquerda** e um **painel de ações à direita**. Navegação anterior/hoje/próximo, incluindo **entre meses**. Substitui a grade-editora-separada + views read-only da v1.
- **D-15 (v2):** Um **toggle único no painel direito: Disponibilidade | Folga**. O modo ativo define o que a pintura aplica. **Verde = disponível**; folga = tratamento neutro (bg-muted/hachura, badge "Folga"), NÃO destructive-red (um dia off não é erro — UI-SPEC v1 §Color).
- **D-16 (v2):** **Interação de pintura** — **clicar** um slot alterna aquele horário; **clicar-e-arrastar** marca um **período contíguo** no dia; controle **"dia inteiro"** marca/desmarca o dia todo. Passo de 30 min preservado (D-03).
- **D-17 (v2):** **Salvar em lote** — o médico pinta várias mudanças e clica **Salvar** uma vez. Estado **"não salvo" visível** (ex.: no botão Salvar / indicador). Ao **navegar/trocar de aba/sair com mudanças não salvas → confirmar antes de descartar** ("você tem mudanças não salvas — descartar?"). Não salvar automático, não perder em silêncio.
- **D-18 (v2):** A aba **Mês é só indicador** (ponto + contagem de livres por dia, como D-07); a **edição/pintura acontece em Dia/Semana**, onde há slots de tempo. Clicar um dia no Mês pode navegar para aquele Dia (a critério do UI-spec), mas não pinta faixa no Mês.

### Modelo de disponibilidade: HÍBRIDO (recorrente + overrides por data)
- **D-19 (v2):** **Template recorrente** por dia da semana + faixa + duração-por-faixa continua sendo a **base** (evolui a v1 `availability_rules`; D-02/D-09 mantidos: múltiplas faixas/dia, duração por faixa).
- **D-20 (v2):** **Overrides por data** sobrescrevem a semana para uma data específica, podendo ser **ADITIVOS** (abrir horário extra pontual — capacidade nova, AGENDA-05) **OU SUBTRATIVOS** (folga: dia inteiro ou faixa parcial — a antiga exceção da v1, D-04). Substitui D-05 (que era só-subtrativo).
- **D-21 (v2):** **Ordem de precedência da expansão** (default sensato — refinar em research/planner): **template recorrente → aplica overrides aditivos da data → aplica folgas subtrativas da data**. Folga vence disponibilidade no mesmo horário. Forma exata do schema (tabela nova `availability_overrides` vs. evolução de `availability_exceptions` com coluna de tipo aditivo/subtrativo) fica a critério do planner, respeitando D-22.

### Migração dos dados da v1
- **D-22 (v2):** **Preservar e migrar** (não recomeçar limpo). Evoluir o schema existente via **ALTER + tabela/coluna nova de overrides**, preservando as `availability_rules` e `availability_exceptions` já cadastradas (regras + folgas de teste). Nova migration owner-scoped, RLS + policies na mesma migration (D-13). As folgas subtrativas existentes devem mapear para o novo conceito de override subtrativo sem perda.

### Requisito novo
- **D-23 (v2):** Registrar **AGENDA-05** em REQUIREMENTS.md: "O médico abre disponibilidade extra pontual por data (override aditivo) que soma horários fora do template recorrente daquele dia." AGENDA-01..04 permanecem (a rastreabilidade deles reabre nesta fase: a UI muda, a expansão muda).

### Continuam válidas da v1 (não re-discutidas)
- **D-03:** Passo de **30 min**. **D-02:** múltiplas faixas por dia. **D-09:** duração **por faixa**. **D-10:** descartar a sobra que não divide certo.
- **D-11:** fuso **fixo America/Sao_Paulo**, **semana começa na segunda**, intervalos **meio-abertos** `[início, fim)`, sem slot duplicado/sumido nas viradas.
- **D-12:** regras/overrides **armazenados**; slots **expandidos na leitura** por **função pura testável** (`.spec.ts`). Nenhuma row-por-slot.
- **D-13:** tabelas **owner-scoped por `profile_id`**, RLS + policies na mesma migration; três camadas `app/ → actions/ → modules/`, gate `profile.status === "paid"` em actions e no RSC.

### [SUPERSEDED pela v2]
- ~~**D-01** grade-editora separada da view~~ → **D-14** (calendário único editável).
- ~~**D-05** exceções apenas subtrativas~~ → **D-20** (overrides aditivos E subtrativos).
- ~~Views read-only dia/semana/mês (v1 06-03)~~ → **D-16/D-17** (calendário editável com pintura + salvar em lote).

### Claude's / planner's discretion
- **Expansão na navegação:** mover a expansão para o **cliente** (a função pura roda no browser conforme navega dia/semana/mês, sobre rules+overrides carregados uma vez) OU round-trip ao servidor por janela. Preferência de partida: **cliente** (a fn já é pura e serializável), mas é decisão de research/planner (avaliar custo de payload de overrides).
- **Mecânica de arraste** (pointer events, seleção retangular numa coluna-dia, feedback visual durante o arraste), range de horas visível, densidade e rótulos — a critério do UI-spec, respeitando D-16 e o passo de 30 min.
- **Forma do schema de overrides** (tabela nova vs. coluna de tipo em `availability_exceptions`), nomes de tabelas/colunas, assinatura exata da `expandAvailability` v2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo & requisitos desta fase
- `.planning/ROADMAP.md` § "Phase 6" — Goal, Success Criteria, UI hint. **Fonte da verdade do escopo.**
- `.planning/REQUIREMENTS.md` — AGENDA-01..04 (integral) + **AGENDA-05** (a ser adicionado nesta fase, D-23).
- `.planning/PROJECT.md` § Key Decisions — agendamento é Phase 7; sem notificações; assento leve Phase 8+.

### Código v1 desta fase (EVOLUIR, não recriar do zero — D-22)
- `supabase/migrations/20260721000100_availability_rules.sql` — tabela recorrente v1 (base do template, D-19).
- `supabase/migrations/20260721000200_availability_exceptions.sql` — exceções subtrativas v1 (evoluir para overrides híbridos, D-20/D-22).
- `lib/expand-availability.ts` + `lib/expand-availability.spec.ts` — **função pura v1 a reescrever** para o modelo híbrido (aditivo+subtrativo, precedência D-21). Manter estilo puro/testável.
- `lib/clinic-timezone.ts` — `CLINIC_TIME_ZONE`.
- `modules/availability/` — 5 módulos CRUD owner-scoped v1 (base para os novos módulos de override).
- `actions/availability/` — 3 actions gated v1. `app/dashboard/agenda/page.tsx` + `components/dashboard/agenda/*` — UI v1 read-only a substituir pelo calendário editável (D-14..D-18).
- `.planning/phases/06-disponibilidade-calend-rio-do-m-dico/06-REVIEW.md` — **pitfalls confirmados a corrigir no v2**: WR-01 (DST-unsafe `addMinutes` absoluto — corrigir na reescrita da fn pura), WR-02 (validação de `exception_date` frouxa com `Date.parse`), WR-03 (sem teto de `end_minute` > 24h), WR-04 (24:00 inalcançável na UI parcial).
- `.planning/phases/06-disponibilidade-calend-rio-do-m-dico/06-01-SUMMARY.md`, `06-02-SUMMARY.md`, `06-03-SUMMARY.md` — o que a v1 entregou.

### Padrões de código a seguir
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/ARCHITECTURE.md` — three-layer, auth+paid gate, ownership scoping.
- `supabase/migrations/20260720000500_patient_vaccine_doses.sql` — template de tabela owner-scoped (RLS + policies juntos).
- `lib/compute-pediatric-age.ts` (+ `.spec.ts`) — molde de função pura + teste.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (a evoluir)
- **`lib/expand-availability.ts`** já é pura/determinística e testada (13 casos, verde sob TZ=UTC e America/New_York). A v2 reescreve para o modelo híbrido mas mantém o contrato puro (window+timeZone por parâmetro) e corrige WR-01 (usar aritmética wall-clock no named-zone, não `addMinutes` absoluto).
- **`@date-fns/tz` ^1.5.0** já instalado e usado (`tz`/`TZDate`). Reusar.
- **`components/ui/*`** (Tabs, Button, Select, Dialog, AlertDialog, react-day-picker) — reusar; o calendário editável (dia/semana) permanece **CSS grid custom, sem lib de calendário** (D-08).
- **`modules/availability/` + `actions/availability/`** — base para os novos módulos/actions de override e para o salvar-em-lote (D-17: provável action que recebe o diff da grade + overrides).

### Established Patterns
- Migrations `YYYYMMDDHHMMSS_*.sql`, RLS+policies no mesmo arquivo. Módulos: uma fn/arquivo, `SupabaseClient` injetado, `[AVAILABILITY]` error tag. Actions: `"use server"`, gate paid, Zod `safeParse`, result union, `revalidatePath`. Rota RSC `app/dashboard/agenda/`.

### Integration Points
- Fase 7 (APPT) escreverá consultas POR CIMA da disponibilidade (forward constraint) — não adicionar FK/coluna de consulta agora.
- O calendário editável deve continuar owner-only, gate paid no RSC e em todo action.

</code_context>

<deferred>
## Deferred Ideas

- **Arraste entre múltiplos dias no Mês** (pintar um range de dias de folga de uma vez) — v2 mantém Mês como indicador (D-18); pintura multi-dia fica para evolução futura.
- **Desfazer/refazer (undo/redo)** da pintura antes de salvar — não nesta fase; o "confirmar descarte" (D-17) já cobre a proteção mínima.
- **No-double-booking / consultas** — Phase 7 (APPT-*).

</deferred>

---

*Phase: 06-disponibilidade-calend-rio-do-m-dico*
*Context gathered: 2026-07-20 (v1); redesign 2026-07-21 via discuss-phase (v2)*

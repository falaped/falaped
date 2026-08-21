# Phase 10: Livro-caixa de Ganhos & Painel - Context

**Gathered:** 2026-08-21
**Status:** Ready for planning

<domain>
## Phase Boundary

O médico cadastra seus preços no perfil (valor da consulta + catálogo de procedimentos com preço cada), e **ao encerrar um caso** o app pergunta o que foi realizado além da consulta e grava os lançamentos financeiros correspondentes em centavos inteiros. Um painel próprio de Ganhos mostra totais por dia/semana/mês, o valor médio por atendimento e a lista de lançamentos do período, agregados em SQL. Lançamentos avulsos (sem caso) entram direto no painel. Nada é apagado — corrigir é anular (`voided_at`) e lançar de novo.

**Entrega esta fase (EARN-01..05):** campos de preço no perfil, catálogo de procedimentos por perfil, diálogo de lançamento no encerramento do caso, lançamento avulso, painel com totais/média/gráfico/lista, anulação com auditoria, tudo escopado por `profile_id` + gate `paid`.

**NÃO entrega (fora de escopo):**
- **Vínculo com a agenda / `appointments`** — removido por decisão do usuário (D-01). A fase deixa de depender da Phase 7.
- Relatório/filtro por forma de pagamento (o campo é gravado, mas não há tela de "quanto entrou por pix") → fase futura.
- Despesas, custos, lucro — a fase é livro-caixa de **entrada**, não DRE.
- Exportação (CSV/PDF) do livro-caixa → fase futura.
- Ganhos visíveis para a assistente (Phase 8/9) — o painel é só do médico dono.

</domain>

<roadmap_deviations>
## Desvios do ROADMAP/REQUIREMENTS (decididos nesta discussão)

**Estes três desvios exigem emenda em `.planning/ROADMAP.md` § Phase 10 e `.planning/REQUIREMENTS.md` antes de planejar.** Não foram inventados aqui — foram escolhidos explicitamente pelo usuário.

| # | Roadmap/Requisito diz | Decidido nesta discussão | Impacto |
|---|---|---|---|
| DV-1 | EARN-01: valor "ligado ao **agendamento**"; Phase 10 "**Depends on** Phase 7"; SC-2 "`appointment_id` nullable" | O lançamento pendura em `cases` (caso encerrado) ou em nada (avulso). **Zero coluna de agendamento.** | Dependência muda de Phase 7 → domínio `cases` (já em produção desde v1.0). Phase 10 fica independente da agenda. |
| DV-2 | EARN-04 / SC-3: média = total ÷ **número de lançamentos** do período | Média = total ÷ (**casos distintos** com lançamento não-anulado + avulsos não-anulados) | Um atendimento com 3 procedimentos conta 1 no denominador. Sem isso a "média por consulta" cai artificialmente em todo atendimento com procedimento extra. |
| DV-3 | Phase 10 escopa apenas lançamento + painel | Inclui **campos de preço no perfil** e **catálogo de procedimentos por perfil** | Superfície nova não prevista no roadmap (2 novas telas/seções + 1 tabela extra). É pré-requisito do gatilho decidido (D-05) — sem preço cadastrado não há o que lançar. Pode virar plano próprio dentro da fase. |

</roadmap_deviations>

<decisions>
## Implementation Decisions

### Âncora do ganho — o que o lançamento referencia
- **D-01:** O lançamento referencia **`cases(id)`** (caso encerrado) ou **nada** (avulso). NÃO existe coluna de agendamento — o vínculo com a agenda sai de vez. — **Reversibility:** one-way — voltar a pendurar em `appointments` exige migration com backfill impossível (não há como inferir qual agendamento gerou um lançamento nascido de caso) e reescrita de toda a agregação.
- **D-02:** `case_id` é nullable (avulso não tem caso). Um lançamento tem caso OU descrição livre, nunca nenhum dos dois.

### Preços no perfil (pré-requisito do gatilho)
- **D-03:** O perfil do médico ganha **"Valor da Consulta"** — o valor padrão cobrado por uma consulta, usado em todo encerramento.
- **D-04:** Procedimentos extras (frenectomia, laserterapia, etc.) viram um **catálogo por perfil, cada item com seu próprio preço**. Molde exato no repo: `supabase/migrations/20260710020400_exam_catalog_items.sql` (per-profile, `profile_id` + nome + RLS + trigger `updated_at`) — acrescentar coluna de preço em centavos.
- **D-05:** O preço é **congelado (snapshot) no lançamento** — o lançamento guarda os centavos copiados no momento da gravação, junto do rótulo do procedimento. Reajustar o preço no perfil hoje NÃO reescreve o faturamento de meses anteriores. — **Reversibility:** one-way — é o que torna os totais auditáveis; trocar para leitura-por-referência depois invalidaria todo o histórico já gravado.

### Gatilho — o lançamento nasce no encerramento do caso
- **D-06:** O gatilho é **encerrar o caso**, não a agenda. Ponto de entrada existente: `components/dashboard/cases/case-detail-actions.tsx:84` ("Encerrar caso", já atrás de um `AlertDialog`) → `updateCaseStatusAction(caseId, "closed")`.
- **D-07:** Ao encerrar, o app **pergunta o que foi realizado de procedimento além da consulta** e gera **1 lançamento da consulta + 1 lançamento por procedimento** escolhido do catálogo.
- **D-08:** **N lançamentos por caso** — sem constraint unique em `case_id`. É o que permite consulta + vários procedimentos no mesmo atendimento.
- **D-09:** **Cortesia é suportada:** ele pode encerrar o caso **sem gerar lançamento nenhum**. Consequência aceita: esse atendimento sai do numerador **e** do denominador da média (a média reflete o que foi cobrado).
- **D-10:** **Re-encerramento não relança.** O caso pode ser reaberto (`update-case-status.ts` reseta o cronômetro), e no encerramento seguinte o app detecta que já existe lançamento não-anulado para aquele caso e **não pergunta nada**. Guarda de aplicação, não de banco (D-08 proíbe unique). — **Reversibility:** reversible — é uma checagem no action.

### Campos do lançamento
- **D-11:** A **data de recebimento é campo próprio do lançamento, escolhido pelo médico** — não herda o instante do encerramento. É essa data que define os buckets dia/semana/mês do painel (cobre o paciente que paga depois). — **Reversibility:** costly — trocar a semântica da data depois muda o bucket de todo lançamento já gravado e, com ele, todos os totais históricos.
- **D-12:** **Forma de pagamento: enum fixo** — pix / dinheiro / cartão / convênio. Gravada em todo lançamento. (A fase grava, mas NÃO entrega relatório por método — ver deferred.)
- **D-13:** **Avulso:** descrição livre **obrigatória** + valor + data + forma de pagamento, sem `case_id`. A descrição é o único jeito de reconhecer o lançamento meses depois.
- **D-14:** Valores sempre em **centavos inteiros** (`integer`/`bigint`), nunca float/numeric-como-dinheiro-em-reais — travado pelo roadmap.

### Painel de Ganhos
- **D-15:** Composição: **cards de totais (hoje / semana / mês) + gráfico de barras por dia + lista de lançamentos do período**. `recharts` 3.9.0 **já está no projeto** (`components/dashboard/patients/growth/growth-chart.tsx`) — é reuso, não dependência nova.
- **D-16:** Abre no **mês atual**.
- **D-17:** **Média = total do período ÷ (nº de casos distintos com lançamento não-anulado + nº de avulsos não-anulados) no período.** Arredondamento único, reconciliando ao centavo. Ver DV-2.
- **D-18:** Menu lateral: **grupo novo "Financeiro"** em `components/app-sidebar.tsx`, contendo o item "Ganhos". Ícone de carteira (`lucide-react`). Nota: o grupo "Agenda" foi removido do sidebar em `4475d4d` — não reintroduzir.

### Anulação (estorno)
- **D-19:** **Não existe edição de valor.** Corrigir = anular + lançar de novo. `voided_at` sempre, `delete` nunca. — **Reversibility:** one-way — é a garantia de auditoria; permitir edição depois apaga a rastreabilidade dos lançamentos já corrigidos por anulação.
- **D-20:** Ele anula **do painel de Ganhos e também de dentro do caso** que gerou o lançamento. Confirmação via `AlertDialog` (padrão do repo, igual "Encerrar caso").
- **D-21:** Lançamento anulado fica **escondido por padrão**, atrás de um filtro "mostrar anulados". Continua no banco; totais e média sempre filtram `voided_at is null`.
- **D-22:** **Toast com "Desfazer" por alguns segundos** limpa `voided_at`; passada a janela, a anulação é definitiva. Padrão já usado na agenda (botões "Limpar disponibilidade/folgas", commit `71bfa06`) — reusar o mesmo padrão de toast/janela.

### Travado pelo roadmap / projeto (não re-discutido)
- **D-23:** Agregação **em SQL** (`date_trunc` + `sum`), buckets pela data local da clínica. Escopo `profile_id` + gate `profile.status === "paid"` em toda leitura/escrita/anulação, com **teste de ownership** (SC-4). RLS + policies na mesma migration.
- **D-24:** Três camadas `app/ → actions/ → modules/`, uma fn por arquivo em `modules/`, `SupabaseClient` injetado, error tag `[EARNINGS]` (ou tag do domínio), Zod `safeParse` no boundary, result union no action. Strings de UI em PT-BR.
- **D-25:** Fuso **America/Sao_Paulo** (`lib/clinic-timezone.ts`), semana começando na segunda — herdado das fases 6/7.

### Claude's Discretion
- **Onde nasce o avulso** (usuário respondeu "você decide"): botão **"Novo lançamento" na página de Ganhos**, e só ali — o avulso não tem horário, não faz sentido na agenda.
- Nomes exatos de tabelas/colunas (`earnings`? `earning_entries`? `procedure_catalog_items`?) e forma da forma-de-pagamento (pg enum vs text+CHECK — o repo usa ambos; enum é o padrão recente).
- Obrigatoriedade da forma de pagamento no diálogo (sugestão: obrigatória, sem default, pra não gravar método errado por inércia).
- Janela exata do "Desfazer" (segundos) — alinhar com o que a agenda já usa.
- Layout/composição visual do painel e do diálogo de encerramento; se o diálogo de valores é um passo dentro do `AlertDialog` de "Encerrar caso" ou um dialog seguinte.
- Se catálogo de procedimentos e campos de preço viram um plano separado dentro da fase (recomendado, dado DV-3).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo & requisitos desta fase
- `.planning/ROADMAP.md` § "Phase 10: Livro-caixa de Ganhos & Painel" — Goal + Success Criteria 1..4. **Ler junto do bloco `<roadmap_deviations>` acima — três critérios estão emendados.**
- `.planning/REQUIREMENTS.md` — EARN-01..EARN-05 (texto integral). EARN-01 e EARN-04 estão emendados (DV-1, DV-2).
- `.planning/PROJECT.md` § Current Milestone — "Painel de ganhos: lançamentos financeiros com totais por dia/semana/mês + valor médio por consulta".

### Domínio `cases` — a nova âncora do ganho (DV-1)
- `modules/cases/update-case-status.ts` — o encerramento (`status: "closed"`, `ended_at`). **Ler com atenção: reabrir reseta `started_at` e o cronômetro** — é a razão de D-10.
- `actions/cases/update-case-status.ts` — o action com gate `paid`.
- `components/dashboard/cases/case-detail-actions.tsx:84` — o botão "Encerrar caso" + `AlertDialog`. Ponto de entrada do diálogo de lançamento (D-06/D-07).
- `modules/cases/types.ts`, `modules/cases/get-case-row-for-profile.ts` — `CaseStatus = "active" | "closed"`, e o escopo real do domínio (`user_phone` resolvido de `profile_id`).
- `supabase/migrations/20260604000003_rls_cases.sql` — **⚠️ leitura obrigatória.** A RLS de `cases` usa **âncora dupla `profile_id` OR `user_phone`** porque `cases.profile_id` é **nullable** (casos de origem WhatsApp podem ter só telefone). Ver landmine abaixo.

### Preços & catálogo (DV-3)
- `supabase/migrations/20260710020400_exam_catalog_items.sql` — **molde exato** do catálogo per-profile (tabela + índice + comment + trigger `updated_at` + RLS/policies num arquivo só).
- `modules/profiles/update-profile.ts`, `modules/profiles/get-profile-by-id.ts`, `modules/profiles/types.ts` — onde os campos de preço entram.
- `app/dashboard/profile/page.tsx`, `app/dashboard/profile/profile-content.tsx` — a tela de perfil onde "Valor da Consulta" e o catálogo aparecem.

### Painel & UI
- `components/dashboard/patients/growth/growth-chart.tsx` — como o repo já usa `recharts` (`ComposedChart`, `ResponsiveContainer`). Reusar a abordagem, não inventar outra (D-15).
- `components/app-sidebar.tsx` — `navMain`; onde o grupo "Financeiro" entra (D-18). O grupo "Agenda" foi removido em `4475d4d`; não reintroduzir.
- `lib/clinic-timezone.ts` — `CLINIC_TIME_ZONE` (D-25).

### Padrões de código a seguir (do repo)
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/ARCHITECTURE.md` — three-layer, auth+paid gate, ownership scoping.
- `supabase/migrations/20260720000500_patient_vaccine_doses.sql` — molde de tabela owner-scoped (RLS + policies juntos).
- `supabase/migrations/20260722100000_save_availability_rpc.sql` + `actions/availability/save-availability.ts` — molde de RPC transacional + action com gate e result union (útil se gravar consulta+N procedimentos precisar de atomicidade).
- `supabase/migrations/20260722200000_appointments.sql` — molde recente de migration bem comentada com pg enum + RLS.

### Achados de scan (research)
- ⚠️ **`cases.profile_id` é nullable + RLS de âncora dupla** (`20260604000003_rls_cases.sql`). Se a tabela de ganhos for `profile_id not null` com FK para `cases`, existe a possibilidade de um caso alcançável por `user_phone` cujo `profile_id` é nulo. Decidir e testar: a policy da tabela de ganhos ancora só em `profile_id` (mais simples, mas casos WhatsApp-origin não geram ganho) ou espelha a âncora dupla. **Item forte de research.**
- ⚠️ **Dinheiro é greenfield no repo** — zero ocorrência de centavos/`amount`/`numeric` como valor monetário. Não há padrão anterior de formatação R$ nem de input de moeda para copiar. Decidir input (máscara? centavos crus?) e formatação (`Intl.NumberFormat('pt-BR')`).
- ⚠️ **Nenhuma migration usa `date_trunc` ou `AT TIME ZONE` hoje** — a agregação com buckets no fuso da clínica (EARN-03) é greenfield.
- 💡 **A D-11 pode simplificar o EARN-03:** como a data de recebimento é *escolhida* pelo médico (um dia de calendário, não um instante), guardá-la como `date` em vez de `timestamptz` elimina a conversão de fuso na agregação — `date_trunc` sobre `date` já é a data local, sem `AT TIME ZONE` e sem risco de DST. Avaliar no research.
- ⚠️ **Nenhum padrão de soft-delete no repo** (`deleted_at`/`voided` não existem em nenhuma migration). `voided_at` (D-19..D-22) é greenfield — inclusive o cuidado de que todo `select` de total/média filtre `voided_at is null`.
- ✅ `recharts` 3.9.0 já instalado — gráfico do painel é reuso.
- ✅ `btree_gist` já habilitado (Phase 7) — irrelevante aqui, mas indica que extensões podem ser habilitadas em migration.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Domínio `cases` completo** (`modules/cases/*`, `actions/cases/*`): a âncora do ganho. `update-case-status.ts` é o gatilho; `get-cases-by-profile-id.ts` serve pra listar/relacionar.
- **`exam_catalog_items`**: molde 1:1 do catálogo de procedimentos por perfil — copiar a estrutura e acrescentar preço.
- **Domínio `profiles`** (`update-profile.ts`, `profile-content.tsx`): onde os campos de preço entram, sem criar tela nova.
- **`recharts`** via `growth-chart.tsx`: o gráfico do painel.
- **Padrão de toast "Desfazer"** já implementado na agenda (`71bfa06`, botões Limpar) — reuso direto pra D-22.
- **`AlertDialog`** de confirmação: já usado em "Encerrar caso" e nas ações destrutivas da agenda.

### Established Patterns
- Migrations `YYYYMMDDHHMMSS_*.sql` com RLS + policies + comments no mesmo arquivo. Módulos: uma fn/arquivo, `SupabaseClient` injetado, `[DOMAIN]` error tag. Actions: `"use server"`, gate `paid`, Zod `safeParse`, result union, `revalidatePath`. Rota RSC sob `app/dashboard/`.
- pg enum é o padrão recente pra domínios fechados (`appointment_status`, `patient_sex`, `medical_certificate_type`) — molde pra forma de pagamento.

### Integration Points
- **`cases` → ganhos:** FK `case_id` + o diálogo enxertado no encerramento. **Não** alterar a máquina de status do caso; o lançamento é efeito colateral do encerramento, não parte dele.
- **`profiles` → ganhos:** valor da consulta e catálogo lidos na hora de montar o diálogo; copiados (snapshot) no lançamento (D-05).
- **`app-sidebar.tsx`:** grupo "Financeiro" novo.
- **Phase 8/9 (assento da assistente):** o painel de ganhos é **do médico dono** — quando o assento existir, ganhos não entram no escopo delegado. Não preparar nada aqui.

</code_context>

<specifics>
## Specific Ideas

Citação do usuário sobre os campos do perfil (fonte de D-03/D-04):

> "no perfil do usuario deverá ser possivel ver alguns campos, por exemplo Valor da Consulta (referente a uma consulta) e Valor do atendimento (referente a outros tipos de metodos aplicados pelo pediatra como frenectomia, Lazerterapia etc..) e esse valor que será utilizado em todas consultas, ao encerrar a consulta deverá perguntar ao paciente O que foi realizado de procedimento a mais da consulta?"

E sobre o gatilho (fonte de D-01/D-06):

> "somente ao encerrar um caso, nao será associado mais a agenda de consultas"

Procedimentos citados como exemplo: **frenectomia**, **laserterapia**. Servem de seed/exemplo do catálogo, não de lista fechada.

</specifics>

<deferred>
## Deferred Ideas

- **Relatório/filtro por forma de pagamento** — o campo é gravado (D-12), mas "quanto entrou por pix este mês" é outra fase.
- **Editar valor de um lançamento** — rejeitado nesta fase (D-19). Se virar dor real, exige repensar a auditoria.
- **Des-anular a qualquer momento** — rejeitado (D-22); só a janela do toast.
- **Vínculo com `appointments`** — removido (D-01/DV-1). Se a agenda voltar ao menu e o médico quiser faturar direto do agendamento, é uma fase nova (e um backfill).
- **Exportação do livro-caixa (CSV/PDF)** — não pedido, não escopado.
- **Despesas / lucro / DRE** — a fase é só entrada de dinheiro.
- **Ganhos visíveis para a assistente** — fora do escopo delegado da Phase 8/9.
- **Preço por convênio / tabela de preços diferente por plano** — não levantado; se aparecer, muda o modelo de preço (D-03/D-04).

</deferred>

---

*Phase: 10-livro-caixa-de-ganhos-painel*
*Context gathered: 2026-08-21 via discuss-phase*

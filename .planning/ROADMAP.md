# Roadmap: Falaped — Milestone v1.1 "Agenda & Ganhos"

## Overview

Este milestone dá ao pediatra solo uma agenda de consultas de primeira classe: disponibilidade recorrente com visualizações dia/semana/mês, agendamento com ciclo "pedido a confirmar → confirmado → realizada/falta/cancelada", um **assento delegado** que deixa uma assistente de confiança — com conta e login próprios — marcar em nome do médico sem nunca tocar o prontuário, e um livro-caixa leve de ganhos com totais por período e valor médio por consulta. O acesso da assistente é um **assento leve por membership** (identidade real autenticada, escopo restrito à agenda), não um link/token session-less — decisão de segurança que evita criar a primeira superfície não autenticada do app sobre dado de menores (LGPD) e prefere acesso nominal, auditável e revogável por pessoa. A ordem segue a cadeia de dependências: primeiro o modelo de disponibilidade + calendário do médico (zero nova superfície de ataque; tudo depende dele), depois as consultas do médico + ciclo de status (com a exclusion constraint no banco que garante não-double-booking), então a fundação de acesso delegado — membership + convite + enforcement de escopo, construída e testada cross-tenant/cross-scope em isolamento, com UI mínima — e só então a UI de agendamento da assistente sobre a fundação já provada, e por fim o livro-caixa de ganhos + painel (ortogonal, ancorado no domínio `cases` do v1.0 — sem dependência da agenda). A fase de assentos é a única marcada para revisão de segurança mais profunda; tudo o mais segue padrões já presentes no código.

**Numeração:** Este é o milestone v1.1. As fases continuam a partir da última fase do v1.0 (Phase 5, arquivada em `.planning/archive/milestone-v1.0/`). Portanto este milestone começa na **Phase 6**.

## Phases

**Phase Numbering:**

- Integer phases (6, 7, 8): Planned milestone work
- Decimal phases (6.1, 6.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 6: Disponibilidade & Calendário do Médico** - Calendário único editável (pintura clique/arraste/dia-inteiro, toggle disponibilidade|folga, salvar em lote) sobre modelo híbrido (template recorrente + overrides por data aditivos/subtrativos); slots expandidos na leitura _(v2 redesign — v1 entregue e arquivada; replanejada 2026-07-21)_ (completed 2026-07-22)
- [x] **Phase 7: Consultas & Ciclo de Status** - Consultas criadas pelo médico, ligadas a um paciente, com ciclo solicitada→confirmada→realizada/falta/cancelada e garantia de não-double-booking no banco (exclusion constraint sobre pendente+confirmada) (completed 2026-07-25)
- [ ] **Phase 8: Assentos & Convite — Fundação de Acesso Delegado (FUNDAÇÃO DE SEGURANÇA)** - Identidade real: tabela de membership (dono ↔ membro, role 'assistant_agenda', status ativo/revogado), fluxo de convite/aceite sobre Supabase Auth, e enforcement de escopo (RLS + verificação de membership) — a assistente logada só alcança agenda + busca/criação mínima de paciente do médico convidante, nunca módulos clínicos nem outro médico; construída e testada cross-tenant/cross-scope em isolamento, com UI mínima
- [ ] **Phase 9: UI de Agendamento da Assistente** - Sobre a sessão autenticada do assento: a assistente loga, vê só a agenda, busca/cria paciente mínimo (dedupe) e marca uma consulta que entra como "pedido a confirmar" e segura o horário
- [ ] **Phase 10: Livro-caixa de Ganhos & Painel** - Preços no perfil (valor da consulta + catálogo de procedimentos), lançamentos financeiros em centavos inteiros nascidos no **encerramento do caso** (ou avulsos), agregação em SQL por dia/semana/mês na data local da clínica, valor médio por atendimento e anulação sem apagar

## Phase Details

### Phase 6: Disponibilidade & Calendário do Médico

**Goal**: O médico gerencia sua disponibilidade num **calendário único editável** (dia/semana/mês, fuso America/Sao_Paulo): pinta disponibilidade (verde) e folgas por clique/arraste/dia-inteiro, alterna entre disponibilidade e folga por um toggle, e salva em lote — sobre um modelo **híbrido** (template recorrente + overrides por data, aditivos e subtrativos). Slots expandidos na leitura por função pura. Sem nova superfície externa de ataque. _(v2 redesign — a v1 foi entregue e arquivada em `archive-v1/`.)_
**Depends on**: Nothing (first phase of milestone; continues from archived v1.0 Phase 5)
**Requirements**: AGENDA-01, AGENDA-02, AGENDA-03, AGENDA-04, AGENDA-05
**Success Criteria** (what must be TRUE):

  1. O médico define disponibilidade recorrente por dia da semana + faixa (pintando no calendário) que se repete semana após semana, sem recriar rows por slot.
  2. O médico define a duração de slot (por faixa) e vê os horários livres gerados — regras armazenadas, slots expandidos na leitura por função pura testável.
  3. O médico bloqueia folga por data (dia inteiro ou faixa parcial) e os horários daquele dia somem; e abre disponibilidade extra pontual por data (override aditivo, AGENDA-05) que soma fora do template.
  4. O médico alterna dia/semana/mês e vê os horários corretos nas viradas (meio-abertos, semana na segunda) no fuso America/Sao_Paulo, sem slot duplicado/sumido; mês = indicador (ponto + contagem), edição em dia/semana.
  5. O médico pinta por clique (slot), arraste (período) e "dia inteiro", com toggle Disponibilidade|Folga, e salva em lote com confirmação antes de descartar mudanças não salvas.

**Plans**: 3/3 plans complete

- [x] 06-01-PLAN.md — Migração híbrida ALTER+backfill + expandAvailability híbrida DST-safe + schema WR-02/03 (checkpoint de push da migração)
- [x] 06-02-PLAN.md — Módulos CRUD de override owner-scoped + action de salvar-em-lote
- [x] 06-03-PLAN.md — Calendário único editável (pintura/toggle/batch save/guarda) + RSC migrado (checkpoint visual)

**UI hint**: yes

### Phase 7: Consultas & Ciclo de Status

**Goal**: O médico cria consultas em horários livres, conduz cada uma pelo ciclo de status completo, e o banco garante que dois pacientes nunca ocupem o mesmo horário — estabelecendo o alvo de FK e a exclusion constraint na qual a fase de assentos vai escrever.
**Depends on**: Phase 6
**Requirements**: APPT-01, APPT-02, APPT-03, APPT-04
**Success Criteria** (what must be TRUE):

  1. O médico cria e edita uma consulta em um horário livre, ligada a um paciente já cadastrado (reusa o domínio patients existente).
  2. Cada consulta percorre o ciclo solicitada (pedido a confirmar) → confirmada → realizada / falta / cancelada, com "falta" distinta de "cancelada" e visível como tal na agenda.
  3. O médico confirma ou recusa um "pedido a confirmar" a partir da agenda / lista de solicitações, e a agenda distingue visualmente pendente de confirmada.
  4. Um horário com consulta **pendente ou confirmada** rejeita uma segunda consulta no banco (exclusion constraint btree_gist escopada por profile_id sobre status em pending+confirmed — "pendente segura o horário"); a violação vira um result union amigável ("horário já ocupado"), nunca um erro cru 23P01.

**Plans**: 2/3 plans executed

- [x] 07-01-PLAN.md — Migração appointments (enum + tabela owner-scoped + RLS + btree_gist + exclusion constraint parcial) + máquina de transições pura + schemas Zod (checkpoint [BLOCKING] de push da migração)
- [x] 07-02-PLAN.md — Módulos (create com preservação de error.code, list por janela, update-status compare-and-set) + actions (createAppointmentAction Confirmada + 23P01→amigável, transitionAppointmentStatusAction) + barrels
- [x] 07-03-PLAN.md — UI: dialog de criação em slot livre + painel "Pedidos a confirmar" + render dos 5 status na agenda + menu de transições + RSC carregando consultas (checkpoint visual)

**UI hint**: yes

### Phase 8: Assentos & Convite — Fundação de Acesso Delegado (FUNDAÇÃO DE SEGURANÇA — construir e testar em isolamento, UI mínima)

**Goal**: A fundação de acesso delegado existe com IDENTIDADE REAL — a assistente tem conta e login próprios, e um membership ativo ao médico convidante a escopa estritamente à agenda + busca/criação mínima de paciente daquele médico. Construída e testada cross-tenant E cross-scope em isolamento, antes de qualquer UI de agendamento: um membership do médico X jamais alcança dados do médico Y, e a assistente jamais alcança prontuário/documentos/crescimento/vacinas/ganhos de nenhum médico. Este é o risco central do milestone — agora o risco é vazamento de escopo do membership, não link vazável.
**Depends on**: Phase 7
**Requirements**: SEAT-01, SEAT-05
**Success Criteria** (what must be TRUE):

  1. O médico convida a assistente por e-mail; ela cria conta e faz login sobre o Supabase Auth (sessão autenticada normal), e um membership (dono ↔ membro, role 'assistant_agenda', status ativo/revogado) registra o vínculo; o médico revoga/reativa o acesso a qualquer momento.
  2. O escopo do assento é enforced em DUAS camadas: RLS nas tabelas (a assistente logada só alcança agenda + paciente do médico convidante via membership ativo) E verificação de membership nas actions; reads clínicos diretos (PostgREST) do assento são NEGADOS por RLS — só o dono alcança prontuário, documentos, crescimento, vacinas e ganhos.
  3. Um teste cross-tenant explícito prova que um membership do médico X não lê nem escreve dados do médico Y; um teste cross-scope explícito prova que o assento não alcança nenhuma tabela clínica de nenhum médico (só agenda + campos mínimos de paciente).
  4. Revogar o membership corta o acesso da assistente imediatamente na próxima requisição (nenhuma sessão remanescente contorna o status revogado).

**Plans**: TBD
**Security review**: REQUIRED (escopo delegado sobre dado de menores/LGPD; o risco central é vazamento de escopo do membership — rodar `/gsd-secure-phase` ou um plano com foco em segurança; testes cross-tenant E cross-scope são o gate de verificação)
**Research note**: o desenho de membership + RLS no Supabase precisa de pesquisa no plan-phase — em especial o **column-scoping** dos dados do paciente (RLS é row-level, então expor só campos mínimos exige uma **action mediada no servidor** que faz o SELECT allow-listado, não um read direto da tabela pelo assento) e como as políticas RLS por membership coexistem com as políticas `profile_id`-do-dono já existentes (RLS agora é a norma em toda tabela pós-2026-06-04).

### Phase 9: UI de Agendamento da Assistente

**Goal**: A assistente de confiança usa seu assento — loga, abre a agenda do médico que a convidou, encontra ou cria um paciente e marca uma consulta que entra como pedido e segura o horário — tudo sobre a sessão autenticada e a fundação de escopo já provada da Phase 8, sem jamais ver o prontuário ou o resto do app.
**Depends on**: Phase 8
**Requirements**: SEAT-02, SEAT-03, SEAT-04
**Success Criteria** (what must be TRUE):

  1. Logada com sua própria conta, a assistente vê apenas a agenda (horários livres + consultas) do médico que a convidou — nenhuma outra tela, rota ou dado do app.
  2. A assistente busca um paciente já cadastrado do médico (via ação mediada no servidor que retorna só campos mínimos, com comprimento mínimo e resultado limitado) ou cria um cadastro mínimo novo ao agendar, com dedupe por nome/responsável.
  3. A assistente marca uma consulta em um horário livre; ela entra como "pedido a confirmar" e **segura o horário** (via a exclusion constraint da Phase 7) até o médico confirmar ou recusar, com estados visuais distintos de pendente vs confirmado.

**Plans**: TBD
**UI hint**: yes

### Phase 10: Livro-caixa de Ganhos & Painel

**Goal**: O médico cadastra seus preços no perfil (valor da consulta + catálogo de procedimentos com preço cada) e, **ao encerrar um caso**, o app pergunta o que foi realizado além da consulta e grava os lançamentos correspondentes em centavos inteiros — com snapshot do preço. Um painel próprio de Ganhos mostra totais por dia/semana/mês, o valor médio por atendimento e a lista de lançamentos, agregados em SQL. Ortogonal às demais fases do milestone; ancorado no domínio `cases` (v1.0), **sem dependência da agenda**.
**Depends on**: Nothing (domínio `cases` já em produção desde o v1.0; a dependência da Phase 7 foi removida — DV-1)
**Requirements**: EARN-01, EARN-02, EARN-03, EARN-04, EARN-05
**Success Criteria** (what must be TRUE):

  1. O médico cadastra o valor da consulta e um catálogo de procedimentos com preço no perfil e, ao encerrar um caso, o app pergunta o que foi realizado além da consulta e grava 1 lançamento da consulta + 1 por procedimento (em R$, centavos inteiros, nunca float), ligados ao caso (`case_id`) com o preço congelado por snapshot; encerrar sem gerar lançamento (cortesia) é permitido e re-encerrar não relança.
  2. O médico registra lançamentos financeiros avulsos pela página de Ganhos, não ligados a caso nenhum (`case_id` nullable), com descrição livre obrigatória.
  3. O médico vê um painel com totais por dia, semana e mês, agregados em SQL (date_trunc/sum) com buckets pela **data local da clínica**, garantidos por `received_on date` — a data de recebimento é um dia de calendário escolhido pelo médico, então `date_trunc` já devolve o bucket local e nenhuma expressão `AT TIME ZONE` é necessária (sem risco de DST nem dependência do `TimeZone` da sessão) _(emendado 2026-08-21: o critério pede o resultado, não a expressão literal — ver 10-01-PLAN.md § Desvios Declarados #1)_. O valor médio por atendimento = total ÷ (casos distintos com lançamento não-anulado + avulsos não-anulados) no período, com arredondamento único que reconcilia ao centavo.
  4. O médico anula/estorna um lançamento sem apagá-lo (voided_at, não delete); totais e média filtram anulados (voided_at IS NULL) e a leitura/escrita/anulação é escopada por profile_id + gate `paid`, com teste de ownership.

**Plans**: 3/5 plans executed

Plans:
**Wave 1**

- [x] 10-01-PLAN.md — Migrações: catálogo de procedimentos com preço + `profiles.consultation_price_cents` + enum de forma de pagamento + `financial_entries` (RLS âncora simples, sem policy de DELETE) + função `get_earnings_summary` (checkpoint:decision das 4 decisões one-way; checkpoint [BLOCKING] de push da migração)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-02-PLAN.md — **TRACER** ponta-a-ponta: contrato de moeda (`parseBrlToCents` + `formatCentsToBRL` + spec), painel lendo `get_earnings_summary` (Faixas A/B), diálogo de lançamento avulso e grupo "Financeiro" no menu (checkpoint visual)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 10-03-PLAN.md — Perfil: card "Preços" com valor da consulta (travessia das 5 camadas, incluindo o `.select()` hardcoded de `get-authenticated-user.ts`) + editor CRUD do catálogo de procedimentos owner-scoped (checkpoint visual)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 10-04-PLAN.md — Encerramento do caso: guarda de re-encerramento + validação de posse do caso (IDOR) + insert único de consulta+N procedimentos, hoist do popover e diálogo de duas etapas, aviso destrutivo em "Excluir caso" (checkpoint visual [BLOCKING], 7 itens)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 10-05-PLAN.md — Anulação com "Desfazer" (owner-scoped + specs) + resto do painel: navegação de período, filtro de anulados, gráfico diário, tabela e card de ganhos dentro do caso (checkpoint visual)

**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Disponibilidade & Calendário do Médico | 3/3 | Complete    | 2026-07-22 |
| 7. Consultas & Ciclo de Status | 3/3 | Complete    | 2026-07-25 |
| 8. Assentos & Convite — Fundação de Acesso Delegado | 0/? | Not started | - |
| 9. UI de Agendamento da Assistente | 0/? | Not started | - |
| 10. Livro-caixa de Ganhos & Painel | 3/5 | In Progress|  |

## Coverage

- v1.1 requirements: 18 total
- Mapped to phases: 18 ✓
- Unmapped: 0

Every v1.1 requirement maps to exactly one phase. No orphans, no duplicates.

| Phase | Requirements |
|-------|--------------|
| 6 | AGENDA-01, AGENDA-02, AGENDA-03, AGENDA-04 |
| 7 | APPT-01, APPT-02, APPT-03, APPT-04 |
| 8 | SEAT-01, SEAT-05 |
| 9 | SEAT-02, SEAT-03, SEAT-04 |
| 10 | EARN-01, EARN-02, EARN-03, EARN-04, EARN-05 |

---
*Roadmap created: 2026-07-20 (milestone v1.1 "Agenda & Ganhos") — phases continue from archived v1.0 (last phase: 5)*
*Updated: 2026-07-20 — acesso da assistente = assento leve por membership (login real + RLS/escopo), substituindo a proposta de link/token session-less. Phase 8 reescrita para "Assentos & Convite"; Phase 9 agora sobre sessão autenticada*

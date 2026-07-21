# Roadmap: Falaped — Milestone v1.1 "Agenda & Ganhos"

## Overview

Este milestone dá ao pediatra solo uma agenda de consultas de primeira classe: disponibilidade recorrente com visualizações dia/semana/mês, agendamento com ciclo "pedido a confirmar → confirmado → realizada/falta/cancelada", um **assento delegado** que deixa uma assistente de confiança — com conta e login próprios — marcar em nome do médico sem nunca tocar o prontuário, e um livro-caixa leve de ganhos com totais por período e valor médio por consulta. O acesso da assistente é um **assento leve por membership** (identidade real autenticada, escopo restrito à agenda), não um link/token session-less — decisão de segurança que evita criar a primeira superfície não autenticada do app sobre dado de menores (LGPD) e prefere acesso nominal, auditável e revogável por pessoa. A ordem segue a cadeia de dependências: primeiro o modelo de disponibilidade + calendário do médico (zero nova superfície de ataque; tudo depende dele), depois as consultas do médico + ciclo de status (com a exclusion constraint no banco que garante não-double-booking), então a fundação de acesso delegado — membership + convite + enforcement de escopo, construída e testada cross-tenant/cross-scope em isolamento, com UI mínima — e só então a UI de agendamento da assistente sobre a fundação já provada, e por fim o livro-caixa de ganhos + painel (ortogonal, depende só da FK de consulta). A fase de assentos é a única marcada para revisão de segurança mais profunda; tudo o mais segue padrões já presentes no código.

**Numeração:** Este é o milestone v1.1. As fases continuam a partir da última fase do v1.0 (Phase 5, arquivada em `.planning/archive/milestone-v1.0/`). Portanto este milestone começa na **Phase 6**.

## Phases

**Phase Numbering:**

- Integer phases (6, 7, 8): Planned milestone work
- Decimal phases (6.1, 6.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 6: Disponibilidade & Calendário do Médico** - Disponibilidade recorrente (grade semanal + duração de slot + exceções) expandida em slots na leitura, visualizada em dia/semana/mês no fuso da clínica
- [ ] **Phase 7: Consultas & Ciclo de Status** - Consultas criadas pelo médico, ligadas a um paciente, com ciclo solicitada→confirmada→realizada/falta/cancelada e garantia de não-double-booking no banco (exclusion constraint sobre pendente+confirmada)
- [ ] **Phase 8: Assentos & Convite — Fundação de Acesso Delegado (FUNDAÇÃO DE SEGURANÇA)** - Identidade real: tabela de membership (dono ↔ membro, role 'assistant_agenda', status ativo/revogado), fluxo de convite/aceite sobre Supabase Auth, e enforcement de escopo (RLS + verificação de membership) — a assistente logada só alcança agenda + busca/criação mínima de paciente do médico convidante, nunca módulos clínicos nem outro médico; construída e testada cross-tenant/cross-scope em isolamento, com UI mínima
- [ ] **Phase 9: UI de Agendamento da Assistente** - Sobre a sessão autenticada do assento: a assistente loga, vê só a agenda, busca/cria paciente mínimo (dedupe) e marca uma consulta que entra como "pedido a confirmar" e segura o horário
- [ ] **Phase 10: Livro-caixa de Ganhos & Painel** - Lançamentos financeiros em centavos inteiros (ligados a consulta ou avulsos), agregação em SQL por dia/semana/mês na data local da clínica, valor médio por consulta e anulação sem apagar

## Phase Details

### Phase 6: Disponibilidade & Calendário do Médico

**Goal**: O médico configura sua disponibilidade recorrente uma vez e vê sua agenda corretamente em dia, semana e mês — a base de calendário sobre a qual tudo o mais é construído, sem nenhuma nova superfície externa de ataque.
**Depends on**: Nothing (first phase of milestone; continues from archived v1.0 Phase 5)
**Requirements**: AGENDA-01, AGENDA-02, AGENDA-03, AGENDA-04
**Success Criteria** (what must be TRUE):
  1. O médico define uma disponibilidade recorrente por dia da semana e faixa de horário (ex: seg e qua 14h–18h) que se repete automaticamente semana após semana sem recriar rows por slot.
  2. O médico define a duração padrão do slot (ex: 30 min) e vê os horários livres gerados dentro das faixas — as regras ficam armazenadas e os slots são expandidos na leitura por uma função pura testável.
  3. O médico bloqueia uma exceção pontual por data (folga/feriado) e os horários daquele dia somem da grade recorrente.
  4. O médico alterna entre dia, semana e mês e vê os horários livres corretos nas viradas de dia/semana/mês (intervalos meio-abertos, semana começando na segunda) e no fuso fixo da clínica (America/Sao_Paulo), sem slot duplicado nem sumido em transição.
**Plans**: TBD
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
**Plans**: TBD
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

**Goal**: O médico acompanha quanto ganha por consulta — registra valores (ligados a uma consulta ou avulsos), vê totais por dia/semana/mês e o valor médio por consulta, com números auditáveis que reconciliam ao centavo. Ortogonal às demais fases; depende só da FK de consulta da Phase 7.
**Depends on**: Phase 7
**Requirements**: EARN-01, EARN-02, EARN-03, EARN-04, EARN-05
**Success Criteria** (what must be TRUE):
  1. O médico registra o valor recebido por uma consulta (em R$, guardado em centavos inteiros, nunca float), ligado ao agendamento.
  2. O médico registra lançamentos financeiros avulsos, não ligados a uma consulta (appointment_id nullable).
  3. O médico vê um painel com totais por dia, semana e mês, agregados em SQL (date_trunc/sum) com buckets pela data local da clínica (AT TIME ZONE 'America/Sao_Paulo'), e o valor médio por consulta = total ÷ número de TODOS os lançamentos do período (avulsos incluídos no denominador), com arredondamento único que reconcilia ao centavo.
  4. O médico anula/estorna um lançamento sem apagá-lo (voided_at, não delete); totais e média filtram anulados (voided_at IS NULL) e a leitura/escrita/anulação é escopada por profile_id + gate `paid`, com teste de ownership.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Disponibilidade & Calendário do Médico | 0/? | Not started | - |
| 7. Consultas & Ciclo de Status | 0/? | Not started | - |
| 8. Assentos & Convite — Fundação de Acesso Delegado | 0/? | Not started | - |
| 9. UI de Agendamento da Assistente | 0/? | Not started | - |
| 10. Livro-caixa de Ganhos & Painel | 0/? | Not started | - |

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

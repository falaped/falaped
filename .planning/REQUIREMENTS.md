# Requirements: Falaped — Milestone v1.1 "Agenda & Ganhos"

**Defined:** 2026-07-20
**Core Value:** A consulta pediátrica flui sem fricção — abrir o paciente, conduzir a consulta e gerar os documentos certos (impressos corretamente) em poucos cliques.

> Os requisitos entregues no ciclo **v1.0** (CONS, PHOTO, GROWTH, DOC, VAC) estão registrados em `PROJECT.md ▸ Requirements ▸ Validated` e arquivados em `.planning/archive/milestone-v1.0/`. Este arquivo cobre apenas o escopo do **v1.1**. Tudo escopado por `profile_id` e atrás do gate de assinatura (`paid`). O acesso da assistente é um **assento leve**: ela cria conta e loga (sessão autenticada normal do Supabase Auth), e um **membership** ativo ao médico convidante escopa o que ela alcança — só agenda + busca/criação mínima de paciente daquele médico, nunca prontuário nem o resto do app. Não há endpoint session-less nem link com token neste ciclo (proposta anterior superada — ver PROJECT.md Key Decisions).

## Milestone v1.1 Requirements

Cada requisito mapeia para exatamente uma fase do roadmap.

### Disponibilidade & Agenda (AGENDA)

- [x] **AGENDA-01**: O médico define disponibilidade recorrente por dia da semana e faixa de horário (ex: seg e qua, 14h–18h), que se repete automaticamente semana após semana _(entregue na v1; reaberto para o redesign v2 — calendário editável)_
- [x] **AGENDA-02**: O médico define a duração padrão do slot de consulta (ex: 30 min); os horários disponíveis são gerados dentro das faixas recorrentes (regras armazenadas, slots expandidos na leitura) _(reaberto v2)_
- [x] **AGENDA-03**: O médico bloqueia exceções pontuais por data (folga/feriado) que removem horários da grade recorrente _(reaberto v2)_
- [x] **AGENDA-04**: O médico visualiza a agenda em dia, semana e mês, vendo os horários livres e as consultas marcadas, corretos nas viradas de dia/semana/mês e no fuso da clínica _(reaberto v2)_
- [x] **AGENDA-05**: O médico abre disponibilidade extra pontual por data (override aditivo) que soma horários fora do template recorrente daquele dia — modelo híbrido: template recorrente + overrides por data (aditivos e subtrativos)

### Agendamento & Ciclo (APPT)

- [ ] **APPT-01**: O médico cria e edita uma consulta em um horário livre, ligada a um paciente cadastrado
- [x] **APPT-02**: Cada consulta percorre um ciclo de status — solicitada (pedido a confirmar) → confirmada → realizada / falta / cancelada — com falta distinta de cancelada
- [ ] **APPT-03**: O médico confirma ou recusa um "pedido a confirmar" a partir da agenda / lista de solicitações
- [x] **APPT-04**: Um horário com consulta **pendente ou confirmada** não pode receber outra consulta (sem double-booking), garantido no banco (exclusion constraint), escopado por `profile_id`

### Acesso Delegado — Assento da Assistente (SEAT)

- [ ] **SEAT-01**: O médico convida a assistente (por e-mail); ela cria conta e faz login; o médico pode revogar/reativar o acesso a qualquer momento (membership com status ativo/revogado)
- [ ] **SEAT-02**: Logada, a assistente vê apenas a agenda (horários livres + consultas) do médico que a convidou — nenhuma outra tela, rota ou dado do app
- [ ] **SEAT-03**: A assistente busca um paciente já cadastrado do médico ou cria um cadastro mínimo (dedupe por nome/responsável), via ação mediada no servidor que só expõe/retorna campos mínimos
- [ ] **SEAT-04**: A assistente marca uma consulta em um horário livre; entra como "pedido a confirmar" e segura o horário até o médico confirmar/recusar
- [ ] **SEAT-05**: O acesso da assistente é escopado por membership ativo ao médico convidante — alcança só agenda + busca/criação mínima de paciente daquele médico; nunca prontuário, documentos, crescimento, vacinas, ganhos, nem dados de outro médico; enforced por RLS + verificação de membership nas actions (testado cross-tenant E cross-scope). Reads clínicos diretos (PostgREST) do assento devem ser negados por RLS — só o dono alcança as tabelas clínicas

### Ganhos (EARN)

- [ ] **EARN-01**: O médico registra o valor recebido por uma consulta (em R$, guardado em centavos inteiros), ligado ao agendamento
- [ ] **EARN-02**: O médico registra lançamentos financeiros avulsos, não ligados a uma consulta
- [ ] **EARN-03**: O médico vê um painel de ganhos com totais por dia, semana e mês (agregação em SQL, buckets pela data local da clínica)
- [ ] **EARN-04**: O painel mostra o valor médio por consulta, calculado como total ÷ número de lançamentos do período (lançamentos avulsos incluídos no denominador), com arredondamento único
- [ ] **EARN-05**: O médico anula/estorna um lançamento sem apagá-lo (totais auditáveis); leitura/escrita/anulação escopadas por `profile_id` + gate `paid`

## Deferred (carry-over do ciclo v1.0)

Reconhecidos e adiados; intocados neste milestone (planos preservados em `.planning/archive/milestone-v1.0/`).

- Exclusão de foto + verificação de segurança (`02-03`, complemento de PHOTO-03)
- Curva de crescimento do prematuro Intergrowth-21st (`03-04`)
- Carteira de vacinação por paciente (registrar aplicadas, ver pendentes/atrasadas por idade)

## Out of Scope

Excluído explicitamente para evitar scope creep. Vários são anti-features sinalizados na pesquisa.

| Feature | Reason |
|---------|--------|
| Notificações de agendamento (WhatsApp/e-mail/SMS) | Decisão do médico: "só vejo no painel". Infra de mensageria + consentimento LGPD fica para depois |
| Pagamento/cobrança online | O app apenas registra o valor recebido; não processa nem cobra pagamentos |
| Link 100% público self-service (família marcando direto) | Expor a base de crianças num link aberto violaria a LGPD; o acesso é da assistente (pessoa confiável, com conta própria e escopo controlado) |
| Link/token session-less para a assistente | Superado — o acesso agora é assento autenticado por membership (identidade real, mais segura/auditável que um segredo compartilhável). Ver PROJECT.md Key Decisions |
| Modelo de organização completo (refatorar `profile_id` → `org_id` em todo o app, papéis) | Path C adiado; o v1.1 usa assento leve escopado à agenda sem migrar a posse das demais tabelas. Pode virar milestone próprio depois |
| Quebra do painel por particular/convênio/cortesia | O médico escolheu totais + média simples neste ciclo; classificação por forma de pagamento fica para v2 |
| Sincronização com Google Calendar / iCal | Integração externa pesada; milestone futuro |
| Lista de espera / overbooking | Fora do fluxo de "pedido a confirmar" deste ciclo |

## Traceability

Cada requisito mapeia para exatamente uma fase do roadmap. Preenchido na criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGENDA-01 | Phase 6 | Complete |
| AGENDA-02 | Phase 6 | Complete |
| AGENDA-03 | Phase 6 | Complete |
| AGENDA-04 | Phase 6 | Complete |
| AGENDA-05 | Phase 6 | Complete |
| APPT-01 | Phase 7 | Pending |
| APPT-02 | Phase 7 | Complete |
| APPT-03 | Phase 7 | Pending |
| APPT-04 | Phase 7 | Complete |
| SEAT-01 | Phase 8 | Pending |
| SEAT-05 | Phase 8 | Pending |
| SEAT-02 | Phase 9 | Pending |
| SEAT-03 | Phase 9 | Pending |
| SEAT-04 | Phase 9 | Pending |
| EARN-01 | Phase 10 | Pending |
| EARN-02 | Phase 10 | Pending |
| EARN-03 | Phase 10 | Pending |
| EARN-04 | Phase 10 | Pending |
| EARN-05 | Phase 10 | Pending |

**Coverage:**

- v1.1 requirements: 18 total
- Mapped to phases: 18 ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-20 (milestone v1.1 "Agenda & Ganhos")*
*Last updated: 2026-07-20 — LINK-* substituído por SEAT-* (assento leve por membership, login real; token superado); traceability 18/18 mapeados, 0 órfãos*

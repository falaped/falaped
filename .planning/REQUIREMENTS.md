# Requirements: Falaped — Milestone v1.1 "Agenda & Ganhos"

**Defined:** 2026-07-20
**Core Value:** A consulta pediátrica flui sem fricção — abrir o paciente, conduzir a consulta e gerar os documentos certos (impressos corretamente) em poucos cliques.

> Os requisitos entregues no ciclo **v1.0** (CONS, PHOTO, GROWTH, DOC, VAC) estão registrados em `PROJECT.md ▸ Requirements ▸ Validated` e arquivados em `.planning/archive/milestone-v1.0/`. Este arquivo cobre apenas o escopo do **v1.1**. Tudo escopado por `profile_id` e atrás do gate de assinatura (`paid`) — **exceto** o endpoint do link com token, que autentica pelo próprio token (decisão de PROJECT.md).

## Milestone v1.1 Requirements

Cada requisito mapeia para exatamente uma fase do roadmap.

### Disponibilidade & Agenda (AGENDA)

- [ ] **AGENDA-01**: O médico define disponibilidade recorrente por dia da semana e faixa de horário (ex: seg e qua, 14h–18h), que se repete automaticamente semana após semana
- [ ] **AGENDA-02**: O médico define a duração padrão do slot de consulta (ex: 30 min); os horários disponíveis são gerados dentro das faixas recorrentes (regras armazenadas, slots expandidos na leitura)
- [ ] **AGENDA-03**: O médico bloqueia exceções pontuais por data (folga/feriado) que removem horários da grade recorrente
- [ ] **AGENDA-04**: O médico visualiza a agenda em dia, semana e mês, vendo os horários livres e as consultas marcadas, corretos nas viradas de dia/semana/mês e no fuso da clínica

### Agendamento & Ciclo (APPT)

- [ ] **APPT-01**: O médico cria e edita uma consulta em um horário livre, ligada a um paciente cadastrado
- [ ] **APPT-02**: Cada consulta percorre um ciclo de status — solicitada (pedido a confirmar) → confirmada → realizada / falta / cancelada — com falta distinta de cancelada
- [ ] **APPT-03**: O médico confirma ou recusa um "pedido a confirmar" a partir da agenda / lista de solicitações
- [ ] **APPT-04**: Um horário com consulta **pendente ou confirmada** não pode receber outra consulta (sem double-booking), garantido no banco (exclusion constraint), escopado por `profile_id`

### Link Delegado da Assistente (LINK)

- [ ] **LINK-01**: O médico gera um link privado com token para a assistente e pode revogar/rotacionar esse link a qualquer momento
- [ ] **LINK-02**: A assistente abre o link sem login e vê apenas a agenda (horários livres) do médico — nunca o prontuário nem o resto do app
- [ ] **LINK-03**: Pelo link, a assistente busca um paciente já cadastrado do médico ou cria um cadastro novo mínimo ao agendar (com dedupe por nome/responsável)
- [ ] **LINK-04**: Pelo link, a assistente marca uma consulta em um horário livre; ela entra como "pedido a confirmar" e **segura o horário** até o médico confirmar ou recusar
- [ ] **LINK-05**: O acesso pelo token é escopado a um único médico — `profile_id` derivado **apenas** do token verificado (token com hash-at-rest ≥256-bit, revogação/expiração, cliente service-role), sem herdar o gate `paid`, sem alcançar dados de outro médico (testado cross-tenant)

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
| Link 100% público self-service (família marcando direto) | Expor a base de crianças num link aberto violaria a LGPD; o link é da assistente (pessoa confiável), com token/escopo controlado |
| Quebra do painel por particular/convênio/cortesia | O médico escolheu totais + média simples neste ciclo; classificação por forma de pagamento fica para v2 |
| Sincronização com Google Calendar / iCal | Integração externa pesada; milestone futuro |
| Lista de espera / overbooking | Fora do fluxo de "pedido a confirmar" deste ciclo |

## Traceability

Cada requisito mapeia para exatamente uma fase do roadmap. Preenchido na criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGENDA-01 | — | Pending |
| AGENDA-02 | — | Pending |
| AGENDA-03 | — | Pending |
| AGENDA-04 | — | Pending |
| APPT-01 | — | Pending |
| APPT-02 | — | Pending |
| APPT-03 | — | Pending |
| APPT-04 | — | Pending |
| LINK-01 | — | Pending |
| LINK-02 | — | Pending |
| LINK-03 | — | Pending |
| LINK-04 | — | Pending |
| LINK-05 | — | Pending |
| EARN-01 | — | Pending |
| EARN-02 | — | Pending |
| EARN-03 | — | Pending |
| EARN-04 | — | Pending |
| EARN-05 | — | Pending |

**Coverage:**

- v1.1 requirements: 18 total
- Mapped to phases: 0 (roadmap ainda não criado)
- Unmapped: 18 ⚠️ (será resolvido no roadmap)

---
*Requirements defined: 2026-07-20 (milestone v1.1 "Agenda & Ganhos")*
*Last updated: 2026-07-20 — definição inicial dos requisitos do v1.1*

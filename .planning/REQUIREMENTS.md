# Requirements: Falaped

**Defined:** 2026-06-28
**Core Value:** A consulta pediátrica flui sem fricção — abrir o paciente, conduzir a consulta e gerar os documentos certos (impressos corretamente) em poucos cliques.

## v1 Requirements

Requisitos deste ciclo. Cada um mapeia para uma fase do roadmap. Tudo escopado por `profile_id` e atrás do gate de assinatura (padrão existente do app).

### Experiência da Consulta (CONS)

- [ ] **CONS-01**: Médico vê a idade da criança exibida por faixa etária a partir da data de nascimento — dias (0–28 dias), meses + dias (~1–24 meses) e anos + meses (≥24 meses)
- [ ] **CONS-02**: Médico inicia um cronômetro de consulta e vê o tempo decorrido ao vivo durante o atendimento
- [ ] **CONS-03**: O início (e fim) da consulta é persistido no registro do atendimento e sobrevive a recarregar a página
- [ ] **CONS-04**: Médico imprime/gera PDF de relatórios e documentos sem espaçamento excessivo nem página em branco extra (correção no `@falaped/falaped-kit/pdf`)

### Foto do Paciente (PHOTO)

- [ ] **PHOTO-01**: Médico pode enviar uma foto na identificação de cada criança
- [ ] **PHOTO-02**: A foto é exibida no perfil/identificação do paciente
- [ ] **PHOTO-03**: As fotos ficam em armazenamento privado, acessíveis apenas ao médico dono (bucket privado, escopo por `profile_id`, URL assinada — não reutilizar o bucket público de logos)

### Documentos Clínicos (DOC)

- [ ] **DOC-01**: Médico gera um **encaminhamento** (especialidade/serviço de destino, motivo, resumo clínico/hipótese, urgência) com PDF, auto-preenchido com os dados do paciente
- [ ] **DOC-02**: Médico gera um **pedido de exames** selecionando itens de um catálogo pesquisável e de painéis reutilizáveis (ex: "rotina lactente"), com hipótese/indicação e observações, gerando PDF
- [ ] **DOC-03**: Médico gera um **relatório médico** de corpo livre (rich text) com cabeçalho/rodapé e PDF — tipo de documento novo, separado do laudo/relatório de caso existente
- [ ] **DOC-04**: Médico pode salvar e reutilizar templates de encaminhamento, pedido de exames e relatório médico (mesmo padrão das receitas)
- [ ] **DOC-05**: Médico gera um **receituário em branco** (corpo vazio no layout de receita) para colar receitas prontas que já mantém
- [ ] **DOC-06**: Médico mantém uma biblioteca de **templates de orientações** por marco (1ª consulta, 1 mês, 2 meses...), podendo selecionar e imprimir

### Vacinas (VAC)

- [ ] **VAC-01**: Médico consulta uma tabela de referência do calendário **SUS/PNI** por idade
- [ ] **VAC-02**: Médico consulta o calendário **particular (SBIm)** por idade, exibido lado a lado com o SUS
- [ ] **VAC-03**: Médico consulta a referência de **vacinação da gestante** (Hepatite B, dTpa a partir de 20 sem, Influenza, COVID-19, VSR/Abrysvo a partir de 28 sem)
- [ ] **VAC-04**: Os calendários são modelados como dado versionado (`vacina, dose, idade recomendada, fonte SUS|SBIm, ano/versão`) com fonte e data de vigência
- [ ] **VAC-05**: Médico registra na **carteira de vacinação** de cada paciente as doses aplicadas (vacina, dose, data, lote, local de aplicação)
- [ ] **VAC-06**: O sistema calcula e mostra as vacinas **pendentes/atrasadas** por idade (diff entre calendário e doses aplicadas)
- [ ] **VAC-07**: Durante a consulta, a **próxima dose** devida é destacada conforme a idade atual da criança

## v2 Requirements

Reconhecidos, mas adiados — fora do roadmap atual.

### Exames por Imagem (EXAM)

- **EXAM-01**: Médico pode anexar foto de um exame ao paciente (sem extração automática)
- **EXAM-02**: Sistema extrai/transcreve o conteúdo do exame a partir da foto via IA

### IA e Analytics (AI)

- **AI-01**: Rascunho assistido por IA de relatório/encaminhamento a partir da transcrição da consulta (Groq já integrado)
- **AI-02**: Analytics de tempo de consulta (média, histórico por paciente) a partir dos dados do cronômetro

## Out of Scope

Excluído explicitamente para evitar scope creep. Vários são anti-features sinalizados na pesquisa.

| Feature | Reason |
|---------|--------|
| Extração de exames por foto via IA (neste ciclo) | Item mais complexo; adiado para v2 ("se não for querer muito") |
| Calendário de vacina editável por médico | PNI/SBIm mudam ~anualmente; edição por usuário desvia da orientação oficial e cria risco/liability |
| Auto-marcar vacinas como aplicadas por idade | Inferir aplicação é perigoso clinicamente (dose perdida escondida como "feita"); só marcar por entrada explícita |
| Integração com RNDS/ConecteSUS | Integração pesada, auth e instabilidade de API gov; milestone futuro |
| Módulo de estoque/inventário de lotes de vacina | Preocupação de gestão de clínica, não de consulta pediátrica (lote fica só como campo opcional na dose) |
| Lembretes/notificações de atraso (SMS/WhatsApp) | Infra de mensageria + consentimento + LGPD sobre dados de menores; mostrar atraso só in-app |
| Reescrever receita/atestado/laudo existentes | Só estender o padrão para novos documentos, não refatorar o que já funciona |

## Traceability

Cada requisito mapeia para exatamente uma fase do roadmap. Sem órfãos, sem duplicatas.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONS-01 | Phase 1 | Pending |
| CONS-02 | Phase 1 | Pending |
| CONS-03 | Phase 1 | Pending |
| CONS-04 | Phase 1 | Pending |
| PHOTO-01 | Phase 2 | Pending |
| PHOTO-02 | Phase 2 | Pending |
| PHOTO-03 | Phase 2 | Pending |
| DOC-01 | Phase 3 | Pending |
| DOC-02 | Phase 3 | Pending |
| DOC-03 | Phase 3 | Pending |
| DOC-04 | Phase 3 | Pending |
| DOC-05 | Phase 3 | Pending |
| DOC-06 | Phase 3 | Pending |
| VAC-01 | Phase 4 | Pending |
| VAC-02 | Phase 4 | Pending |
| VAC-03 | Phase 4 | Pending |
| VAC-04 | Phase 4 | Pending |
| VAC-05 | Phase 5 | Pending |
| VAC-06 | Phase 5 | Pending |
| VAC-07 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-28*
*Last updated: 2026-06-28 after roadmap creation (traceability mapped)*

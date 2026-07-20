# Roadmap: Falaped

## Overview

Este ciclo melhora a experiência da consulta pediátrica, amplia os tipos de documento clínico, acompanha o crescimento da criança e adiciona suporte completo a vacinação — sem trocar a arquitetura. O caminho segue a cadeia de dependências da pesquisa: primeiro as correções de dor de uso e o motor de idade (a "keystone" que tudo de crescimento e vacina consome, e a correção de PDF que todo documento novo herda); depois a foto privada da criança (decisão de privacidade isolada); então a curva de crescimento por paciente (medições antropométricas plotadas por idade, primeiro consumidor do motor de idade); em seguida os documentos clínicos novos sobre o padrão de receitas; então o calendário de vacinas como dado de referência; e por fim a carteira por paciente, que cruza idade × calendário × doses aplicadas. Cada fase entrega uma capacidade observável de ponta a ponta.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Experiência da Consulta** - Idade pediátrica precisa, cronômetro de consulta e impressão de PDF sem páginas extras (completed 2026-06-28)
- [ ] **Phase 2: Foto Privada do Paciente** - Foto da criança em armazenamento privado com URL assinada e consentimento (LGPD)
- [ ] **Phase 3: Curva de Crescimento** - Medições antropométricas por paciente (peso, estatura, PC, IMC) plotadas em gráficos por idade sobre curvas de referência OMS, com histórico atualizável
- [x] **Phase 4: Documentos Clínicos Novos** - Encaminhamento, pedido de exames, relatório médico, receituário em branco e biblioteca de orientações (completed 2026-07-19)
- [x] **Phase 5: Calendário de Vacinas (Referência)** - Tabelas SUS/PNI, particular/SBIm e gestante como dado versionado, somente leitura (executed 2026-07-19; pending UAT + security) (completed 2026-07-20)
- [ ] **Phase 6: Carteira de Vacinação por Paciente** - Registro de doses aplicadas com pendentes/atrasadas e próxima dose por idade

## Phase Details

### Phase 1: Experiência da Consulta

**Goal**: O médico vê a idade da criança com precisão pediátrica, cronometra o atendimento e imprime/gera PDFs sem espaçamento excessivo nem página em branco extra — resolvendo a dor de uso diária (prioridade #1 do PROJECT.md) e estabelecendo o motor de idade que toda lógica de vacina vai consumir.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: CONS-01, CONS-02, CONS-03, CONS-04
**Success Criteria** (what must be TRUE):

  1. Ao abrir um paciente, o médico vê a idade exibida pela faixa etária correta — dias para recém-nascido (0–28d), meses + dias para lactente (~1–24m) e anos + meses (≥24m) — derivada da data de nascimento e correta nos casos de borda (fim de mês, ano bissexto, virada de ano, perto da meia-noite local)
  2. O médico inicia um cronômetro de consulta e vê o tempo decorrido contando ao vivo durante o atendimento
  3. O tempo decorrido continua correto após recarregar a página ou navegar e voltar (calculado a partir de um timestamp de início persistido, não de um contador que zera)
  4. O médico gera/imprime um relatório existente e o PDF não tem página em branco extra nem faixa de espaço sobrando no rodapé — verificado em conteúdo de 1 página, no limite (~1,05 página) e em múltiplas páginas

**Plans**: 5 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Schema foundation: gestational_age + cases pause columns + started_at default + db push (wave 1)
- [x] 01-02-PLAN.md — Pediatric age engine (pure, tested) + PT-BR formatter (wave 1, TDD)
- [x] 01-03-PLAN.md — CONS-04 PDF fix: Path B (in-repo) shipped — sanitization + console.log removal + repro script. **Path A (@falaped/falaped-kit release for the ~1.05-page boundary) deferred to Phase 6** (kit is a published external package; in-repo Path B covers 1-page and multi-page). (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-04-PLAN.md — Age display slice: gestational field + hero/case-header badge + assistant adapter (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-05-PLAN.md — Consultation timer slice: elapsed helper + pause/resume + draggable widget (wave 3)

### Phase 2: Foto Privada do Paciente

**Goal**: O médico anexa uma foto na identificação de cada criança e a vê no perfil, com a foto guardada em armazenamento privado acessível só ao médico dono — fechando a decisão de privacidade/LGPD (bucket privado, URL assinada, consentimento, exclusão) antes que qualquer atalho de "copiar o bucket público de logos" se espalhe.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03
**Success Criteria** (what must be TRUE):

  1. O médico envia uma foto na identificação da criança e ela aparece no perfil/identificação do paciente
  2. A foto é servida por URL assinada de curta duração; uma requisição não autenticada (`curl`) ao objeto falha (bucket `public=false`, escopo por `profile_id`, caminho — não URL pública — guardado no banco)
  3. Apagar a foto remove tanto o objeto do storage quanto a referência no banco, e o fluxo captura/registra o consentimento do responsável (postura LGPD para dado de menor)

**Plans**: 3 plans
**UI hint**: yes
Plans:

**Wave 1**

- [x] 02-01-PLAN.md — Foundation: photo/consent columns + private patient-photos bucket & storage RLS + Patient type/selects + upload schema + [BLOCKING] schema push (wave 1)

**Wave 2** *(blocked on Wave 1)*

- [x] 02-02-PLAN.md — Upload + display slice (PHOTO-01/02): client compression + photo modules + gated upload action + form photo field & consent checkbox + AvatarImage on hero/list/case header (wave 2)

**Wave 3** *(blocked on Wave 2)*

- [ ] 02-03-PLAN.md — Delete + consent-completeness + security verification (PHOTO-03 criterion 3): idempotent storage remove + delete-patient cleanup + remove-photo AlertDialog + curl-fails security check (wave 3)

### Phase 3: Curva de Crescimento

**Goal**: O pediatra registra as medições antropométricas de cada criança ao longo do tempo (peso, comprimento/estatura, perímetro cefálico e IMC derivado) e visualiza a curva de crescimento em gráficos por idade — sobrepondo as medições do paciente às curvas de referência OMS (percentis/z-score) — mantendo um histórico atualizável. É o primeiro consumidor do motor de idade pediátrica da Phase 1, que posiciona cada medição pela idade correta.
**Mode:** mvp
**Depends on**: Phase 1 (o motor de idade pediátrica testado é a keystone para posicionar cada medição pela idade da criança)
**Requirements**: GROWTH-01, GROWTH-02, GROWTH-03
**Success Criteria** (what must be TRUE):

  1. O pediatra registra uma medição (data + peso e/ou comprimento/estatura e/ou perímetro cefálico) para um paciente; o IMC é derivado quando peso e estatura existem; a medição persiste como histórico escopado por `profile_id` + `patient_id`
  2. O pediatra vê gráficos de curva de crescimento por idade (peso/idade, estatura/idade, IMC/idade, perímetro cefálico/idade) com as medições do paciente plotadas sobre as curvas de referência OMS (percentis/z-score), usando a idade pediátrica da Phase 1; a referência exibe fonte e faixa etária coberta
  3. O pediatra atualiza o histórico — edita e remove medições — e os gráficos refletem a mudança; leitura/escrita/exclusão aplicam o gate de assinatura (`paid`) e escopam por `profile_id` (uma requisição de outro médico não acessa nem apaga a medição)

**Plans**: 3/4 plans executed
**UI hint**: yes
Plans:

**Wave 1**

- [x] 03-01-PLAN.md — Slice registrar medição: motor de idade +36m + tabela patient_measurements (RLS + [BLOCKING] push) + módulos/action create+get + form/histórico no perfil (wave 1)

**Wave 2** *(blocked on Wave 1)*

- [x] 03-02-PLAN.md — Slice curva OMS: math LMS + reference JSON WHO (human-verify) + recharts (human-verify) + growth-chart (tabs/toggles/corrected-age) + position readout (wave 2)
- [x] 03-03-PLAN.md — Slice editar/remover histórico: update/delete escopados (ownership specs/IDOR) + modo edit do form + AlertDialog de remoção (wave 2)

**Wave 3** *(blocked on Wave 2 / 03-02)*

- [ ] 03-04-PLAN.md — Slice curva do prematuro: LMS Intergrowth-21st JSON (human-verify fonte/licença) + reference-index estendido + regra de transição Intergrowth→OMS + banda de prematuro no growth-chart (D-01/D-04, OQ1) (wave 3)

### Phase 4: Documentos Clínicos Novos

**Goal**: O médico gera três novos tipos de documento (encaminhamento, pedido de exames, relatório médico) mais receituário em branco e uma biblioteca de orientações — cada um reaproveitando o padrão das receitas (wizard + template salvável + PDF), auto-preenchido com os dados do paciente e herdando o builder de PDF já corrigido na Phase 1.
**Mode:** mvp
**Depends on**: Phase 1 (correção de PDF deve preceder os novos documentos, que reusam o mesmo `@falaped/falaped-kit/pdf`)
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06
**Success Criteria** (what must be TRUE):

  1. O médico gera um encaminhamento (especialidade/serviço, motivo, resumo clínico/hipótese, urgência) e um relatório médico de corpo livre (rich text), ambos com PDF auto-preenchido com nome/DOB/idade do paciente, sem página em branco extra
  2. O médico monta um pedido de exames selecionando itens e gera o PDF com hipótese/indicação e observações
  3. O médico salva e reutiliza templates de encaminhamento, pedido de exames e relatório médico (mesmo padrão das receitas)
  4. O médico gera um receituário em branco (layout de receita, corpo vazio) e seleciona/imprime orientações de uma biblioteca por marco (1ª consulta, 1 mês, 2 meses...)
  5. Cada novo documento aplica o gate de assinatura (`paid`) e escopa toda leitura/escrita/exclusão por `profile_id` — uma requisição de outro médico não acessa nem apaga o documento

**Plans**: 5/5 plans complete
**UI hint**: yes
Plans:

**Wave 1**

- [x] 04-01-PLAN.md — Slice Encaminhamento (DOC-01) + template salvável (DOC-04): migration/RLS/storage + módulos + action (gate paid/IDOR) + rota + wizard (Combobox+urgência) + sidebar (wave 1)

**Wave 2** *(sequenciada — compartilha app-sidebar/actions/index/constants)*

- [x] 04-02-PLAN.md — Slice Relatório médico (DOC-03) + template (DOC-04): título + corpo rich-text único (RichTextEditor) → htmlToPlainTextForPdf → buildMedicalCertificatePdf, domínio novo separado do laudo (wave 2)

**Wave 3** *(sequenciada)*

- [x] 04-03-PLAN.md — Slice Pedido de exames (DOC-02) + template (DOC-04): catálogo pesquisável + texto livre + painéis default/próprios editáveis (D-03) + seed clínico human-verify (wave 3)

**Wave 4** *(sequenciada)*

- [x] 04-04-PLAN.md — Slice Orientações (DOC-06): biblioteca por marco de puericultura (seed editável, human-verify) + documento imprimível com auto-fill do paciente (wave 4)

**Wave 5** *(sequenciada)*

- [x] 04-05-PLAN.md — Slice Receituário em branco (DOC-05): modo `?mode=blank` do wizard de receita existente (pula guard de min-1-medicamento) + sidebar (wave 5)

### Phase 5: Calendário de Vacinas (Referência)

**Goal**: O médico consulta, durante o atendimento, o calendário de vacinas por idade — SUS/PNI e particular/SBIm lado a lado, mais a referência da gestante — modelado como dado versionado com fonte e data de vigência, somente leitura, para responder "o que está previsto nesta idade?".
**Mode:** mvp
**Depends on**: Phase 1 (motor de idade é a keystone para apresentar o calendário por idade da criança)
**Requirements**: VAC-01, VAC-02, VAC-03, VAC-04
**Success Criteria** (what must be TRUE):

  1. O médico consulta a tabela de referência do calendário SUS/PNI por idade
  2. O médico vê o calendário particular (SBIm) por idade ao lado do SUS, e consulta a referência de vacinação da gestante (Hepatite B, dTpa a partir de 20 sem, Influenza, COVID-19, VSR/Abrysvo a partir de 28 sem)
  3. Cada calendário (SUS, particular, gestante) é um dataset separado e claramente rotulado, com fonte e data de vigência visíveis na UI (vintage + aviso de "confirmar contra o calendário oficial atual")

**Plans**: 4/4 plans complete
**UI hint**: yes
Plans:

**Wave 1**

- [x] 05-01-PLAN.md — Slice foundation: vaccine_schedules + vaccine_schedule_items (global-read RLS, D-07) + [BLOCKING] db push + SUS clinical seed (human-verify) + read module + /dashboard/vaccines route rendering SUS end-to-end (VAC-01/VAC-04) (wave 1)

**Wave 2** *(sequenciada — compartilha view/column/page)*

- [x] 05-02-PLAN.md — Slice SBIm lado a lado: SBIm seed (human-verify) + duas colunas alinhadas por faixa etária + proveniência por dataset (VAC-02/VAC-04) (wave 2)

**Wave 3** *(sequenciada)*

- [x] 05-03-PLAN.md — Slice Gestante: seed no eixo de semanas gestacionais (human-verify) + abas Criança|Gestante + lista por vacina com janela em texto (VAC-03/VAC-04) (wave 3)

**Wave 4** *(sequenciada)*

- [x] 05-04-PLAN.md — Slice entrada por paciente: rota `?patientId` + link na ficha + destaque da faixa etária atual (motor de idade, position-only) nas duas colunas (D-02/D-03/D-11) (wave 4)

### Phase 6: Carteira de Vacinação por Paciente

**Goal**: O médico registra na carteira de cada paciente as doses aplicadas e o sistema mostra o que está pendente/atrasado por idade e destaca a próxima dose devida — cruzando o motor de idade (Phase 1) com o calendário-como-dado (Phase 5) e as doses aplicadas, transformando a carteira de papel em apoio à decisão.
**Mode:** mvp
**Depends on**: Phase 1 (motor de idade testado) e Phase 5 (calendário de referência como dado; o diff pendente/atrasado precisa dos dois)
**Requirements**: VAC-05, VAC-06, VAC-07
**Success Criteria** (what must be TRUE):

  1. O médico registra na carteira de um paciente uma dose aplicada (vacina, dose, data, lote e local opcionais), e ela persiste escopada por `profile_id` + `patient_id`
  2. O sistema mostra, por idade atual da criança, quais vacinas estão pendentes/atrasadas (diff entre o calendário e as doses aplicadas), usando o helper de idade testado da Phase 1
  3. Durante a consulta, a próxima dose devida é destacada conforme a idade atual da criança
  4. O registro e a leitura da carteira aplicam o gate de assinatura (`paid`) e escopam por `profile_id` em leitura/escrita/exclusão — sem acesso entre tenants

**Plans**: TBD
**UI hint**: yes

**Carried over from Phase 1 — CONS-04 Path A (kit release):** publish a new `@falaped/falaped-kit` version that removes the forced 200pt footer reserve (early `addPage()`) and fixes the `heightOfString` estimate≠render drift, then bump the pin in this app and re-verify `repro-1.05.pdf` collapses to 1 page. Phase 1 shipped the in-repo Path B (1-page + multi-page clean); this closes the ~1.05-page boundary. Note: Phase 4 documents reuse the same PDF builder and inherit Path B until this lands.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Experiência da Consulta | 5/5 | Complete   | 2026-06-28 |
| 2. Foto Privada do Paciente | 2/3 | In Progress|  |
| 3. Curva de Crescimento | 3/4 | In Progress|  |
| 4. Documentos Clínicos Novos | 5/5 | Complete   | 2026-07-19 |
| 5. Calendário de Vacinas (Referência) | 4/4 | Complete    | 2026-07-20 |
| 6. Carteira de Vacinação por Paciente | 0/TBD | Not started | - |

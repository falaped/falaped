# Roadmap: Falaped

## Overview

Este ciclo melhora a experiência da consulta pediátrica, amplia os tipos de documento clínico e adiciona suporte completo a vacinação — sem trocar a arquitetura. O caminho segue a cadeia de dependências da pesquisa: primeiro as correções de dor de uso e o motor de idade (a "keystone" que tudo de vacina consome, e a correção de PDF que todo documento novo herda); depois a foto privada da criança (decisão de privacidade isolada); então os documentos clínicos novos sobre o padrão de receitas; em seguida o calendário de vacinas como dado de referência; e por fim a carteira por paciente, que cruza idade × calendário × doses aplicadas. Cada fase entrega uma capacidade observável de ponta a ponta.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Experiência da Consulta** - Idade pediátrica precisa, cronômetro de consulta e impressão de PDF sem páginas extras (completed 2026-06-28)
- [ ] **Phase 2: Foto Privada do Paciente** - Foto da criança em armazenamento privado com URL assinada e consentimento (LGPD)
- [ ] **Phase 3: Documentos Clínicos Novos** - Encaminhamento, pedido de exames, relatório médico, receituário em branco e biblioteca de orientações
- [ ] **Phase 4: Calendário de Vacinas (Referência)** - Tabelas SUS/PNI, particular/SBIm e gestante como dado versionado, somente leitura
- [ ] **Phase 5: Carteira de Vacinação por Paciente** - Registro de doses aplicadas com pendentes/atrasadas e próxima dose por idade

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
- [x] 01-03-PLAN.md — CONS-04 PDF fix: Path B (in-repo) shipped — sanitization + console.log removal + repro script. **Path A (@falaped/falaped-kit release for the ~1.05-page boundary) deferred to Phase 5** (kit is a published external package; in-repo Path B covers 1-page and multi-page). (wave 1)

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

**Plans**: TBD
**UI hint**: yes

### Phase 3: Documentos Clínicos Novos

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

**Plans**: TBD
**UI hint**: yes

### Phase 4: Calendário de Vacinas (Referência)

**Goal**: O médico consulta, durante o atendimento, o calendário de vacinas por idade — SUS/PNI e particular/SBIm lado a lado, mais a referência da gestante — modelado como dado versionado com fonte e data de vigência, somente leitura, para responder "o que está previsto nesta idade?".
**Mode:** mvp
**Depends on**: Phase 1 (motor de idade é a keystone para apresentar o calendário por idade da criança)
**Requirements**: VAC-01, VAC-02, VAC-03, VAC-04
**Success Criteria** (what must be TRUE):

  1. O médico consulta a tabela de referência do calendário SUS/PNI por idade
  2. O médico vê o calendário particular (SBIm) por idade ao lado do SUS, e consulta a referência de vacinação da gestante (Hepatite B, dTpa a partir de 20 sem, Influenza, COVID-19, VSR/Abrysvo a partir de 28 sem)
  3. Cada calendário (SUS, particular, gestante) é um dataset separado e claramente rotulado, com fonte e data de vigência visíveis na UI (vintage + aviso de "confirmar contra o calendário oficial atual")

**Plans**: TBD
**UI hint**: yes

### Phase 5: Carteira de Vacinação por Paciente

**Goal**: O médico registra na carteira de cada paciente as doses aplicadas e o sistema mostra o que está pendente/atrasado por idade e destaca a próxima dose devida — cruzando o motor de idade (Phase 1) com o calendário-como-dado (Phase 4) e as doses aplicadas, transformando a carteira de papel em apoio à decisão.
**Mode:** mvp
**Depends on**: Phase 1 (motor de idade testado) e Phase 4 (calendário de referência como dado; o diff pendente/atrasado precisa dos dois)
**Requirements**: VAC-05, VAC-06, VAC-07
**Success Criteria** (what must be TRUE):

  1. O médico registra na carteira de um paciente uma dose aplicada (vacina, dose, data, lote e local opcionais), e ela persiste escopada por `profile_id` + `patient_id`
  2. O sistema mostra, por idade atual da criança, quais vacinas estão pendentes/atrasadas (diff entre o calendário e as doses aplicadas), usando o helper de idade testado da Phase 1
  3. Durante a consulta, a próxima dose devida é destacada conforme a idade atual da criança
  4. O registro e a leitura da carteira aplicam o gate de assinatura (`paid`) e escopam por `profile_id` em leitura/escrita/exclusão — sem acesso entre tenants

**Plans**: TBD
**UI hint**: yes

**Carried over from Phase 1 — CONS-04 Path A (kit release):** publish a new `@falaped/falaped-kit` version that removes the forced 200pt footer reserve (early `addPage()`) and fixes the `heightOfString` estimate≠render drift, then bump the pin in this app and re-verify `repro-1.05.pdf` collapses to 1 page. Phase 1 shipped the in-repo Path B (1-page + multi-page clean); this closes the ~1.05-page boundary. Note: Phase 3 documents reuse the same PDF builder and inherit Path B until this lands.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Experiência da Consulta | 5/5 | Complete   | 2026-06-28 |
| 2. Foto Privada do Paciente | 0/TBD | Not started | - |
| 3. Documentos Clínicos Novos | 0/TBD | Not started | - |
| 4. Calendário de Vacinas (Referência) | 0/TBD | Not started | - |
| 5. Carteira de Vacinação por Paciente | 0/TBD | Not started | - |

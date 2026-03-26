# PRD — FALAPED (Product Requirements Document)

## Visao do produto

O FALAPED e uma plataforma para pediatras gerenciarem atendimentos originados no WhatsApp com fluxo clinico estruturado: caso, paciente, relatorio, receita e atestado em um unico sistema.

## Objetivos do produto

## Objetivos de curto prazo (0-3 meses)

| Objetivo | Indicador de sucesso |
|---|---|
| Aumentar ativacao inicial | Conversao cadastro -> vinculacao WhatsApp |
| Aumentar uso do fluxo principal | % de casos com relatorio finalizado |
| Aumentar utilidade documental | % de casos com receita ou atestado |
| Reduzir friccao operacional | Tempo medio para fechar caso |

## Objetivos de medio prazo (3-6 meses)

| Objetivo | Indicador de sucesso |
|---|---|
| Expandir adocao em clinicas pequenas | Numero de contas com 2+ medicos |
| Consolidar retencao | Retencao mensal de contas pagas |
| Melhorar previsibilidade comercial | Conversao trial/piloto -> paid |

## Escopo funcional atual (baseline do produto)

- Autenticacao com Supabase Auth.
- Vinculacao de conta ao WhatsApp por codigo de 6 digitos.
- Gestao de casos (listagem, detalhe, status, associacao com paciente).
- Gestao de pacientes (CRUD e historico associado).
- Relatorio do atendimento com IA e edicao por secao.
- Templates de relatorio (CRUD + geracao por IA).
- Receitas (templates, wizard, listagem e PDF).
- Atestados (wizard, listagem e PDF).
- Discussões clinicas separadas de casos.

## Priorizacao de features (MoSCoW)

## Must Have

| Feature | Justificativa |
|---|---|
| Login e sessao segura | Porta de entrada para toda a operacao |
| Vincular WhatsApp | Dependencia para jornada real de casos |
| Casos + detalhe + chat | Nucleo operacional do produto |
| CRUD de pacientes | Relacao caso-paciente e historico clinico |
| Relatorio do atendimento | Principal ganho de produtividade |
| Ownership e controle de acesso | Seguranca e privacidade obrigatorias |

## Should Have

| Feature | Justificativa |
|---|---|
| Templates de relatorio (CRUD + ativo) | Padronizacao de conduta/documentacao |
| Melhorar secao com IA | Qualidade textual e velocidade de revisao |
| Receitas com PDF | Alta frequencia no atendimento pediatrico |
| Atestados com PDF | Demanda recorrente de responsaveis |
| Filtros e busca em listagens | Escalabilidade de uso diario |

## Could Have

| Feature | Justificativa |
|---|---|
| Dashboard analitico de produtividade | Suporte a decisao de gestao clinica |
| Automacoes de follow-up por caso | Maior continuidade assistencial |
| Configuracao de politicas por clinica | Melhor suporte a contas multiusuario |

## Won't Have (agora)

| Feature | Motivo de adiamento |
|---|---|
| App mobile nativo completo | Prioridade atual e consolidar web e metricas |
| Marketplace de pacientes | Fora do foco core de produtividade clinica |
| Faturamento TISS completo | Nao e a proposta principal do primeiro ciclo |

## User flows principais

## Fluxo 1 — Ativacao e acesso ao dashboard

1. Usuario cria conta ou faz login.
2. Sessao e validada server-side.
3. Usuario acessa dashboard.
4. Se ainda nao vinculado, e direcionado para vincular WhatsApp.

## Fluxo 2 — Vinculacao WhatsApp

1. Usuario autenticado gera codigo de 6 digitos.
2. Envia codigo ao bot via WhatsApp.
3. Bot valida codigo nao expirado.
4. Sistema vincula telefone ao profile.
5. Usuario retorna ao dashboard com conta vinculada.

## Fluxo 3 — Operacao de caso

1. Pediatra abre lista de casos (ativos primeiro).
2. Entra no detalhe do caso e visualiza conversa.
3. Associa paciente existente ou cria paciente.
4. Gera relatorio via IA.
5. Edita secoes e finaliza relatorio.
6. Opcionalmente gera receita e/ou atestado.

## Fluxo 4 — Gestao de templates

1. Usuario acessa templates de relatorio.
2. Cria manualmente ou gera estrutura por IA.
3. Define template ativo para uso nos proximos casos.

## Casos de uso-chave

| Ator | Caso de uso | Resultado esperado |
|---|---|---|
| Pediatra | Finalizar caso com relatorio | Registro estruturado e reutilizavel |
| Pediatra | Emitir receita em minutos | Documento PDF pronto para envio |
| Pediatra | Emitir atestado rapidamente | Atendimento administrativo agil |
| Secretaria | Localizar documento por paciente | Menos retrabalho e mais previsibilidade |
| Gestor de clinica | Padronizar templates da equipe | Qualidade consistente entre medicos |

## Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-01 | O sistema deve autenticar usuarios por email/senha | Must |
| RF-02 | O sistema deve validar sessao em rotas protegidas | Must |
| RF-03 | O usuario deve conseguir vincular WhatsApp via codigo temporario | Must |
| RF-04 | O sistema deve listar casos por profile e status | Must |
| RF-05 | O usuario deve visualizar detalhe do caso com mensagens | Must |
| RF-06 | O usuario deve associar/desassociar paciente do caso | Must |
| RF-07 | O sistema deve gerar relatorio por secoes com IA | Must |
| RF-08 | O usuario deve editar, reordenar e finalizar relatorio | Must |
| RF-09 | O usuario deve cadastrar/editar/excluir pacientes | Must |
| RF-10 | O usuario deve gerar receitas com PDF em storage | Should |
| RF-11 | O usuario deve gerar atestados com PDF em storage | Should |
| RF-12 | O usuario deve gerenciar templates de relatorio e receita | Should |
| RF-13 | O sistema deve permitir busca/filtro em listagens principais | Should |

## Requisitos nao-funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-01 | Seguranca de acesso por ownership (`profile_id`) | 100% das operacoes sensiveis protegidas |
| RNF-02 | Disponibilidade em ambiente web responsivo | Suporte de uso diario em desktop e mobile browser |
| RNF-03 | Tempo de resposta em fluxos criticos | < 2s em operacoes de leitura mais comuns (rede normal) |
| RNF-04 | Auditoria minima de erros | Logs em falhas de modulos e APIs |
| RNF-05 | Integridade de dados clinicos | Validacao de entrada e schema consistente |
| RNF-06 | Idioma da UX | PT-BR em textos de interface e mensagens ao usuario |

## Criterios de aceitacao (por feature critica)

## CA-01 — Vincular WhatsApp

- Dado usuario autenticado sem vinculacao,
- Quando gera codigo valido e envia ao bot dentro do prazo,
- Entao o status de vinculacao e atualizado e o acesso ao dashboard e liberado.

## CA-02 — Gerar relatorio do atendimento

- Dado caso com mensagens e template efetivo,
- Quando o usuario clica em gerar relatorio,
- Entao o sistema cria secoes preenchidas e persiste o relatorio associado ao caso.

## CA-03 — Finalizar relatorio

- Dado relatorio em edicao,
- Quando o usuario marca "finalizar edicao",
- Entao campos editaveis ficam bloqueados e o estado `is_finalized` e persistido.

## CA-04 — Receita PDF

- Dado usuario autenticado e owner da receita,
- Quando solicita download,
- Entao API retorna redirecionamento para signed URL valida e temporaria.

## CA-05 — Atestado PDF

- Dado usuario autenticado e owner do atestado,
- Quando solicita download,
- Entao API retorna redirecionamento para signed URL valida e temporaria.

## Cronograma do que foi feito (desde o primeiro commit)

## Linha do tempo consolidada

| Fase | Periodo | Entregas principais | Commits de referencia |
|---|---|---|---|
| Fundacao | 2026-02-27 | Setup Next.js + Supabase, auth base, design system inicial | `90b5f55` a `19b9ca7` |
| Auth e perfil | 2026-02-28 | Profiles/authenticated_users, vincular WhatsApp, perfil completo | `f404975` a `dd842d4` |
| Pacientes e casos | 2026-03-01 | CRUD pacientes, associacao caso-paciente, status de casos | `5e1a0d9` a `1e28736` |
| Relatorio do atendimento | 2026-03-01 a 2026-03-02 | Schema `case_reports`, Groq, actions e UI integrada | `5cc2c0e` a `95327df` |
| Discussões e templates | 2026-03-13 a 2026-03-14 | Discussões com busca/filtro, templates de relatorio com IA | `cc28767` a `7701f55` |
| Atestados e receitas | 2026-03-14 a 2026-03-15 | Wizards, PDF, listagens, templates de receita, melhorias UX | `d6c433d` a `9df4c80` |

## Marco de evolucao do produto

| Data | Marco |
|---|---|
| 2026-02-27 | Base tecnica pronta para evolucao do dashboard |
| 2026-02-28 | Fluxo de autenticacao e vinculacao de WhatsApp operacional |
| 2026-03-01 | Nucleo assistencial (casos + pacientes) consolidado |
| 2026-03-02 | Relatorio do atendimento entregue ponta a ponta |
| 2026-03-14 | Entrada em documentos clinicos formais (atestado/receita) |
| 2026-03-15 | Refino de UX e robustez das listagens/documentos |

## Dependencias e premissas

| Item | Estado atual | Impacto no roadmap |
|---|---|---|
| Supabase (Auth/DB/Storage) | Ativo e central | Alta dependencia tecnica |
| Groq API | Ativo para geracao/melhoria de texto | Impacta custo e latencia |
| Fluxo WhatsApp-bot | Contrato documentado | Impacta ativacao e onboarding |
| Deploy web (Vercel) | Preparado por configuracao Next | Impacta operacao e observabilidade |

## Documentos complementares

| Documento | Descricao |
|---|---|
| [docs/prd/dashboard-home.md](../prd/dashboard-home.md) | PRD da tela Inicio (`/dashboard`), discovery e brief de UX |

## Fora do escopo deste PRD

- Plano detalhado de GTM (documentado no MRD).
- Desenho de arquitetura de app mobile nativo completo.
- Detalhamento juridico regulatorio de telemedicina (sera tratado em politica/compliance separado).

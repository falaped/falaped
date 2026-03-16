# PRD - Product Requirements Document (FALAPED)

## Visao do produto

O FALAPED e um assistente operacional para pediatras, nativo no WhatsApp e conectado a uma camada web, que estrutura o atendimento em fluxos de caso e discussao, preserva contexto clinico e gera relatorio de forma rapida.

## Objetivos de produto

| Objetivo | Resultado esperado | Indicador principal |
|---|---|---|
| Reduzir friccao operacional no WhatsApp | Menos tempo para organizar conversa e contexto | tempo medio para concluir fluxo de caso |
| Aumentar confiabilidade do fluxo clinico | Menos quebra de fluxo e menos ambiguidades | taxa de conclusao de fluxos sem fallback manual |
| Elevar valor percebido | Relatorio e continuidade de caso usados com frequencia | relatorios gerados/usuario ativo |
| Preparar escalabilidade de produto | backlog orientado por prioridade e impacto | throughput de demandas P0/P1 |

## Escopo atual do produto

## Fluxo macro implementado

`Webhook -> Buffer (8s) -> runRound -> auth -> contexto -> confirmacoes -> intents -> route -> chat/report`

## Principais capacidades em producao

| Capacidade | Status | Valor para o usuario |
|---|---|---|
| Onboarding e vinculacao por codigo | Implementado | habilita uso autenticado sem friccao alta |
| Fluxo Caso vs Discussao | Implementado | separa conversa estruturada de discussao clinica |
| Cadastro/associacao de paciente no inicio do caso | Implementado | melhora qualidade do contexto |
| Comandos e botoes contextuais | Implementado | reduz ambiguidade em texto livre |
| Geracao de relatorio PDF | Implementado | entrega artefato clinico com valor tangivel |
| Reabertura de caso/discussao | Implementado | melhora continuidade operacional |

## Priorizacao de features (MoSCoW)

## Must Have (M)

| Feature | Motivo | Origem |
|---|---|---|
| Confiabilidade do chat com fallback em erro de LLM | evita silencio para usuario | demandas de ajustes e fallback Groq |
| Fluxo Caso/Discussao com contexto consistente | nucleo do produto | fases caso vs discussao |
| Confirmacao de relatorio com acao correta | evita erro funcional critico | demandas de report confirmation |
| Vinculacao de numero com fluxo claro | requisito basico para uso pago | fases do auth/link code |

## Should Have (S)

| Feature | Motivo | Origem |
|---|---|---|
| Lista de comandos por contexto | reduz confusao operacional | demanda "Ver Comandos" |
| Melhorias de copy e UX pos-vinculacao | acelera ativacao | demandas UX 0035/0037 |
| Revisao PT-BR de relatorio antes de PDF | melhora qualidade percebida | demanda Groq revisao de texto |
| Reabrir caso/discussao com lista guiada | reforca continuidade | demanda 0020 + fluxo discussao |

## Could Have (C)

| Feature | Motivo | Origem |
|---|---|---|
| Midia e documentos adicionais (imagem/PDF clinico) | amplia escopo de uso | demandas de contexto/midia |
| Arquivamento/resumo de mensagens antigas | melhora eficiencia em conversas longas | demanda de arquivamento |
| Cache Redis em queries chave | ganho de latencia/custo | demanda infra cache |

## Won't Have Now (W)

| Item | Decisao |
|---|---|
| Suporte de produto para pais/responsaveis | fora do escopo; publico e medico/pediatra |
| Expansao ampla para clinicas grandes antes de PMF | adiado ate validar retencao e monetizacao no ICP atual |

## User flows e casos de uso

## Fluxo 1 - iniciar caso (sem conversa ativa)

| Passo | Acao do usuario | Resposta esperada do sistema |
|---|---|---|
| 1 | medico envia mensagem inicial | bot oferece botoes de inicio |
| 2 | escolhe "Iniciar Caso" | sistema pede dados do paciente |
| 3 | envia dados completos | sistema cria paciente/caso e confirma abertura |
| 4 | segue conversa clinica | respostas com contexto de caso |

## Fluxo 2 - iniciar discussao

| Passo | Acao do usuario | Resposta esperada do sistema |
|---|---|---|
| 1 | medico escolhe "Iniciar Discussao" | sistema abre discussao ativa |
| 2 | envia duvida clinica | chat responde no contexto de discussao |
| 3 | escolhe finalizar/reiniciar | fluxo de intent encerra ou abre nova discussao |

## Fluxo 3 - gerar relatorio

| Passo | Acao do usuario | Resposta esperada do sistema |
|---|---|---|
| 1 | solicita relatorio | sistema valida pre-condicoes |
| 2 | se ja existe relatorio WhatsApp | confirma "gerar novo" vs "manter atual" |
| 3 | gera ou reaproveita | envia PDF para o medico |

## Fluxo 4 - reabrir caso/discussao

| Passo | Acao do usuario | Resposta esperada do sistema |
|---|---|---|
| 1 | escolhe reabrir no menu | sistema lista conversas fechadas |
| 2 | seleciona item numerado | sistema reabre e confirma estado ativo |

## Requisitos funcionais

| ID | Requisito |
|---|---|
| FR-01 | O sistema deve receber webhook da AvisaAPI e normalizar payload de texto/audio. |
| FR-02 | O sistema deve enfileirar eventos por telefone e processar com janela de buffer de 8s. |
| FR-03 | O sistema deve autenticar usuario por telefone e tratar estados lead/unpaid/blocked/paid. |
| FR-04 | O sistema deve suportar dois modos de conversa: caso e discussao. |
| FR-05 | O sistema deve exigir dados obrigatorios de paciente para iniciar caso. |
| FR-06 | O sistema deve gerar resposta de chat contextualizada ao fluxo ativo. |
| FR-07 | O sistema deve suportar geracao de relatorio PDF com template. |
| FR-08 | O sistema deve tratar confirmacoes de relatorio existente antes de sobrescrever. |
| FR-09 | O sistema deve permitir reabertura de caso/discussao fechados. |
| FR-10 | O sistema deve disponibilizar comandos contextuais para orientar o usuario. |

## Requisitos nao-funcionais

| ID | Requisito |
|---|---|
| NFR-01 | Confiabilidade: processar mensagens de forma idempotente por `(phone, external_message_id)`. |
| NFR-02 | Performance: iniciar rodada de processamento apos janela de 8s sem backlog crescente. |
| NFR-03 | Observabilidade: logs estruturados por modulo (Avisa, Orchestrator, Groq, Supabase). |
| NFR-04 | Seguranca: validar envs com schema e proteger endpoint de job com segredo. |
| NFR-05 | Escalabilidade: arquitetura modular por dominio para evolucao incremental. |
| NFR-06 | UX: manter copy clara e acao guiada por botoes sempre que possivel. |

## Criterios de aceitacao (por macrofeature)

## Caso/Discussao

- Dado que nao ha conversa ativa, quando o medico iniciar interacao, entao deve receber opcoes claras de fluxo.
- Dado que o medico inicia caso, quando dados obrigatorios do paciente forem enviados, entao o caso deve ser criado com `patient_id`.
- Dado que o medico inicia discussao, quando enviar mensagens clinicas, entao o sistema deve responder no contexto de discussao.

## Relatorio

- Dado que ha historico minimo, quando o medico solicitar relatorio, entao o sistema deve gerar PDF e enviar no WhatsApp.
- Dado que ja existe relatorio WhatsApp, quando o medico escolher "nao, manter atual", entao o sistema deve reenviar o PDF existente.
- Dado erro de LLM no chat, quando a excecao ocorrer, entao o usuario deve receber mensagem de fallback.

## Reabertura

- Dado que existem casos/discussoes fechados, quando o medico pedir reabertura, entao o sistema deve listar opcoes e reabrir o item escolhido.

## Cronograma historico desde o primeiro commit

Primeiro commit: **2026-02-21**.

## Linha do tempo consolidada

| Data | Marco principal | Evidencia no historico |
|---|---|---|
| 2026-02-21 | Base do projeto (Next.js, webhook, Supabase, estrutura inicial) | commits iniciais de bootstrap e webhook Avisa |
| 2026-02-22 | Buffer e intent flow inicial (continuar/finalizar/iniciar outro) | introducao de `awaiting_intent`, closeCase, Trigger.dev |
| 2026-02-23 | Evolucao de pacientes e fluxo de relatorio | fases de cadastro paciente, report request, refatoracoes iniciais |
| 2026-02-24 a 2026-02-26 | PDF, UX de Avisa, templates de relatorio, refinamentos | sendMedia/sendDocument, report templates customizaveis |
| 2026-02-27 a 2026-02-28 | Router-first, profile_id, vinculacao por codigo | consolidacao de auth/link code e ajustes de caso |
| 2026-03-02 | case_reports com source, onboarding interativo e docs de modelagem | maturidade de dados e governanca de schema |
| 2026-03-03 a 2026-03-05 | Grande refatoracao do orchestrator e diagramas de fluxo | handlers por responsabilidade, context, confirmacoes, flow visual |
| 2026-03-05 | Reestruturacao de modulo Groq + botoes caso/discussao | modelos, pastas por dominio e substituicao de classificadores |
| 2026-03-06 | Demandas UX/produto e expandir sendButtons | kanban demandas, filtros, ajustes de intent e comandos |
| 2026-03-07 a 2026-03-11 | Validacao SaaS, melhorias de relatorio, reabertura e fallback | pagina analise, envio de PDF existente, reabrir caso/discussao |

## Roadmap de produto (proximo ciclo)

| Prioridade | Entrega | Objetivo |
|---|---|---|
| P0 | robustez de contexto + fallback + confiabilidade de relatorio | reduzir falhas perceptiveis |
| P1 | metricas de uso e retencao + melhorias de onboarding | provar valor e monetizacao |
| P2 | midia/documentos e eficiencia de historico | ampliar casos de uso com controle de escopo |

## Dependencias e riscos de produto

| Tipo | Item | Impacto |
|---|---|---|
| Dependencia | disponibilidade AvisaAPI/Groq/Supabase | indisponibilidade externa afeta UX |
| Dependencia | qualidade de dados de historico | afeta qualidade do relatorio |
| Risco | escopo crescer antes de PMF | compromete foco no ICP atual |
| Risco | falta de instrumentacao de KPI | dificulta decisao de roadmap |

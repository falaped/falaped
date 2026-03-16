# SRD - Software Requirements Document (FALAPED)

## Escopo tecnico

Este documento define requisitos de software para o falaped-bot, cobrindo arquitetura atual, integracoes, banco de dados, performance, seguranca, especificacoes de canais (Web e Mobile) e padrao de deploy.

## Arquitetura tecnica (stack atual)

## Stack

| Camada | Tecnologia atual | Papel no sistema |
|---|---|---|
| Runtime | Node.js 22 | execucao server-side |
| Framework | Next.js 16 + React 19 + TypeScript 5 | API routes e interfaces web |
| Mensageria | AvisaAPI (WhatsApp) | entrada/saida de mensagens |
| IA | Groq | chat, classificacao, extracao e relatorios |
| Banco | Supabase PostgreSQL | dados transacionais e estado de fluxo |
| Jobs | Trigger.dev v4 | orquestracao de buffer assicrono |
| Storage | Supabase Storage | arquivos PDF de relatorio |
| Validacao | Zod | validacao de ambiente e payload |
| UI Web | Tailwind CSS + React Flow | paginas de monitoramento e diagrama |

## Arquitetura logica

| Bloco | Responsabilidade |
|---|---|
| `app/api/webhooks/avisa` | entrada HTTP do webhook e delegacao para orchestrator |
| `modules/orchestrator` | fluxo principal de negocio por rodada (`runRound`) |
| `modules/avisa` | cliente e envio de mensagens/botoes/documentos |
| `modules/groq` | operacoes de LLM por dominio (chat/classify/extract/report/audio) |
| `modules/supabase` | queries por dominio com tipagem e isolamento |
| `lib/` | utilitarios transversais (copy, env, parser, pdf, logger) |

## APIs e integracoes especificas

## APIs internas (Next.js routes)

| Endpoint | Metodo | Objetivo | Autenticacao |
|---|---|---|---|
| `/api/health` | GET | health check | publica |
| `/api/webhooks/avisa` | POST | receber eventos do WhatsApp | validacao por payload/processo |
| `/api/jobs/process-buffer` | POST | processar lote por telefone apos janela | Bearer com `PROCESS_BUFFER_SECRET` |

## Integracao AvisaAPI

| Funcao | Uso |
|---|---|
| `sendMessage` | envio de texto |
| `sendButtons` | envio de opcoes guiadas |
| `sendMedia/sendDocument` | envio de PDF e arquivos |
| `markReadMessage` | UX de leitura |
| `chatTyping` | UX de digitando |

Requisito:
- Toda acao Avisa deve isolar erro externo e manter logging consistente com prefixo de modulo.

## Integracao Groq

| Dominio | Funcao principal | Modelo de referencia |
|---|---|---|
| Chat | `chatPediatrics` | `openai/gpt-oss-120b` |
| Classificacao | route/intent classifiers | modelos 8b/70b conforme modulo |
| Extracao | dados de paciente | `llama-3.3-70b-versatile` |
| Relatorio | geracao e revisao PT-BR | `openai/gpt-oss-120b` |
| Audio | transcricao | `whisper-large-v3` |

Requisito:
- Em falha de LLM no chat, sistema deve responder fallback ao medico (sem silencio).

## Integracao Trigger.dev

| Processo | Descricao |
|---|---|
| Janela de buffer | 8 segundos por telefone |
| Reschedule | nova mensagem no mesmo phone reprograma run |
| Processamento | job chama `runRound` com eventos agregados |

## Banco de dados (Supabase schema)

## Entidades principais

| Tabela | Papel |
|---|---|
| `authenticated_users` | status de acesso (`paid/unpaid/blocked`) e vinculacao por telefone |
| `profiles` | dados do medico (CRM/RQE/templates/estado de conversa) |
| `cases` | conversa estruturada de caso clinico |
| `case_messages` | historico de mensagens do caso |
| `case_reports` | relatorios por caso (source whatsapp/web) |
| `discussions` | conversa de discussao clinica sem paciente obrigatorio |
| `discussion_messages` | historico de discussao |
| `patients` | cadastro de paciente associado ao caso |
| `incoming_webhook_events` | buffer e idempotencia de entrada |
| `trigger_buffer_runs` | controle de run atual por telefone |
| `phone_link_codes` | vinculacao de numero ao perfil |
| `report_templates` | template configuravel de relatorio |

## Relacionamentos criticos

| Relacao | Regra |
|---|---|
| `profiles` -> `cases`/`discussions` | escopo por medico/perfil |
| `cases` -> `patients` | caso deve carregar `patient_id` no fluxo principal |
| `cases` -> `case_messages` | 1:N com historico cronologico |
| `cases` -> `case_reports` | 1:N com relatorios por origem |
| `discussions` -> `discussion_messages` | 1:N para fluxo de discussao |

## Constraints e garantias

| Item | Garantia |
|---|---|
| idempotencia de webhook | unique `(phone, external_message_id)` em `incoming_webhook_events` |
| busca de caso/discussao ativos | indices por `profile_id + status` |
| vinculacao de numero | trigger sincroniza `linked_phone_status` apos uso de link code |
| armazenamento de PDF | bucket `report-pdfs` no Supabase Storage |

## Requisitos de performance

| ID | Requisito |
|---|---|
| PERF-01 | O processamento por telefone deve respeitar janela de buffer de 8s para reduzir chamadas repetidas. |
| PERF-02 | Queries Supabase devem usar `select` explicito e filtros indexados quando aplicavel. |
| PERF-03 | Fluxos de chat devem evitar reprocessamento desnecessario do historico. |
| PERF-04 | A resposta ao usuario deve ser enviada mesmo em degradacao parcial de dependencia externa. |

## Requisitos de seguranca

| ID | Requisito |
|---|---|
| SEC-01 | Variaveis de ambiente obrigatorias devem ser validadas no startup via schema. |
| SEC-02 | Endpoint `/api/jobs/process-buffer` deve rejeitar requests sem Bearer valido. |
| SEC-03 | Erros HTTP devem seguir mapeamento controlado (400/403/404/500) sem vazar detalhes sensiveis. |
| SEC-04 | Logs nao devem expor segredos de integracao nem dados desnecessarios do paciente. |
| SEC-05 | Operacao em saude deve considerar LGPD e minimizacao de dados em trafego e storage. |

## Requisitos de confiabilidade

| ID | Requisito |
|---|---|
| REL-01 | `runRound` deve manter ordem de decisao fixa: auth -> context -> confirmacoes -> intent -> route -> chat. |
| REL-02 | Eventos processados devem ser marcados para evitar duplicidade de resposta. |
| REL-03 | Fluxo de confirmacao de relatorio deve impedir sobrescrita acidental sem escolha explicita. |
| REL-04 | Em falha de integracao, deve haver log estruturado e comportamento previsivel para o usuario. |

## Mobile + Web specs (React Native + Web)

## Estado atual de canais

| Canal | Status atual | Papel no produto |
|---|---|---|
| WhatsApp (mobile-first) | principal e implementado | operacao clinica diaria do medico |
| Web (Next.js) | implementado | visibilidade de demandas, diagrama e analise |
| App externo (`app.falaped`) | complementar | camada de gestao e operacao web |

## Especificacao para canal mobile React Native (futuro)

| Item | Requisito |
|---|---|
| RN-01 | O app React Native deve consumir as mesmas APIs de autenticacao/estado usadas no ecossistema atual. |
| RN-02 | Fluxos de caso/discussao devem manter semantica identica ao WhatsApp para evitar divergencia de negocio. |
| RN-03 | Estado de conversa deve permanecer centralizado no Supabase (single source of truth). |
| RN-04 | Entrega inicial RN deve priorizar consulta de contexto e status de caso, sem duplicar orchestrator local. |
| RN-05 | UX mobile deve manter copy orientada a medico/pediatra, sem adaptar para publico leigo. |

## Deploy (Vercel)

## Topologia de deploy

| Componente | Plataforma |
|---|---|
| Aplicacao Next.js (`falaped-bot`) | Vercel |
| Jobs assincronos | Trigger.dev Cloud |
| Banco e storage | Supabase Cloud |

## Variaveis de ambiente relevantes

| Variavel | Uso |
|---|---|
| `AVISAAPI_TOKEN` / `AVISAAPI_URL` | integracao WhatsApp |
| `NEXT_PUBLIC_SUPABASE_URL` | endpoint Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | chave publica app |
| `GROQ_API_KEY` | chamadas LLM/transcricao |
| `PROCESS_BUFFER_SECRET` | protecao do job endpoint |
| `TRIGGER_SECRET_KEY` / `TRIGGER_PROJECT_REF` | Trigger.dev |

## Requisitos de release

| ID | Requisito |
|---|---|
| DEP-01 | Build de producao deve completar sem erro (`pnpm build`). |
| DEP-02 | Alteracao de schema deve vir com migration e atualizacao de documentacao de modelagem. |
| DEP-03 | Deploy de jobs Trigger.dev deve acompanhar mudancas de buffer/orquestracao. |
| DEP-04 | Mudancas em integracao Avisa/Groq/Supabase devem atualizar docs/skills relevantes. |

## Criticos para aceite tecnico

- Fluxo end-to-end do webhook ate resposta precisa operar sem etapas manuais.
- Mapeamento de erro e fallback devem proteger experiencia do medico em falha externa.
- Documentacao de schema e arquitetura deve refletir estado real para evolucao segura.

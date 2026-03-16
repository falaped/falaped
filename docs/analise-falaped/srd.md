# SRD — FALAPED (Software Requirements Document)

## Escopo tecnico

Este documento descreve os requisitos de software do FALAPED no estado atual da aplicacao web e define diretrizes para evolucao mobile (React Native) com reaproveitamento do backend existente.

## Arquitetura tecnica (stack atual)

## Stack principal

| Camada | Tecnologia | Uso no FALAPED |
|---|---|---|
| Frontend web | Next.js (App Router) + React 19 | Pages server-first, layouts e rotas protegidas |
| UI | Tailwind CSS + Shadcn/Radix | Componentes reutilizaveis e tema por tokens |
| Backend BaaS | Supabase (Auth, Postgres, Storage) | Autenticacao, dados clinicos e arquivos PDF |
| IA | Groq SDK | Geracao/melhoria de texto clinico |
| Validacao | Zod + react-hook-form | Validacao de entrada e formularios |
| PDF | pdfkit | Geracao de receitas e atestados |
| Deploy alvo | Vercel | Hosting web e runtime Node/Edge conforme rotas |

## Visao de componentes

| Componente | Responsabilidade |
|---|---|
| `app/` | Rotas e pages (auth, dashboard, api) |
| `components/` | UI primitives e feature components |
| `modules/` | Regras de negocio + queries Supabase por dominio |
| `actions/` | Server Actions por contexto funcional |
| `lib/supabase` | Clients browser/server/proxy de sessao |
| `docs/tipagens/modelagem` | Contrato de modelagem do banco |

## Fluxo tecnico de alto nivel

1. Usuario autentica via Supabase Auth.
2. Proxy valida sessao em cada request protegido.
3. Pages server-side buscam dados via `modules/*`.
4. Mutacoes ocorrem via Server Actions e/ou Route Handlers.
5. PDFs sao gerados/persistidos em Supabase Storage.
6. Downloads usam signed URL curta para acesso temporario.

## APIs e integracoes especificas

## Integracao Supabase

| Servico | Uso |
|---|---|
| Auth | Login/signup e resolucao de usuario autenticado |
| Postgres | Tabelas de casos, pacientes, relatorios, receitas e atestados |
| Storage | Buckets de PDFs e logos |

## Integracao Groq

| Endpoint logico | Funcao |
|---|---|
| `generate-case-report` | Gerar conteudo inicial do relatorio por secoes |
| `improve-report-section` | Melhorar redacao de secao especifica |
| `generate-report-template-sections` | Sugerir estrutura de template por IA |

## APIs HTTP internas (Route Handlers)

| Rota | Metodo | Objetivo | Regra de seguranca |
|---|---|---|---|
| `/api/prescriptions/[id]/download` | GET | Redirecionar para signed URL de receita | Valida auth e ownership por `profile_id` |
| `/api/medical-certificates/[id]/download` | GET | Redirecionar para signed URL de atestado | Valida auth e ownership por `profile_id` |

## Contrato de autenticação e sessao

| Item | Regra |
|---|---|
| Validacao de sessao | Feita com `supabase.auth.getUser()` no proxy |
| Rotas publicas | `/`, `/auth/*` |
| Rotas protegidas | `/dashboard/*`, `/api/*` sensiveis |
| Redirecionamento | Nao autenticado -> `/auth/login`; autenticado em auth/home -> `/dashboard` |

## Banco de dados (Supabase schema)

## Tabelas nucleares de dominio

| Dominio | Tabelas |
|---|---|
| Identidade e perfil | `profiles`, `authenticated_users`, `phone_link_codes` |
| Atendimento | `cases`, `case_messages`, `case_reports` |
| Pacientes | `patients` |
| Documentos | `prescriptions`, `prescription_templates`, `medical_certificates`, `report_templates` |
| Conversas livres | `discussions`, `discussion_messages` |
| Operacional | `incoming_webhook_events`, `leads`, `trigger_buffer_runs` |

## Relacionamentos relevantes

| Relacao | Proposito |
|---|---|
| `profiles` -> `cases` | Isolamento de dados por medico |
| `cases` -> `patients` | Associar atendimento ao paciente |
| `cases` -> `case_reports` | Registro estruturado do atendimento |
| `profiles` -> `prescriptions`/`medical_certificates` | Ownership de documentos |
| `profiles` -> `report_templates` | Customizacao por medico/clinica |

## Fonte oficial de modelagem

- `docs/tipagens/modelagem/README.md`
- `docs/tipagens/modelagem/*.md` (por tabela)
- `docs/tipagens/modelagem/enums.md`
- `docs/tipagens/modelagem/triggers.md`
- `docs/tipagens/modelagem/functions.md`

## Requisitos de performance

## Objetivos tecnicos

| ID | Requisito | Meta inicial |
|---|---|---|
| PERF-01 | Listagens principais com resposta rapida | p95 < 2s em rede padrao |
| PERF-02 | Geracao de signed URL para download | p95 < 1s (sem contar download do arquivo) |
| PERF-03 | Operacoes de mutacao com feedback claro | Resposta de sucesso/erro consistente |
| PERF-04 | Escalabilidade de leitura | Queries com select explicito e filtros por ownership |

## Diretrizes de implementacao

- Evitar N+1 em consultas relacionadas.
- Centralizar acesso ao banco em `modules/*`.
- Revalidar paths apos mutacoes relevantes.
- Monitorar latencia de acoes com IA separadamente das CRUDs.

## Requisitos de seguranca

## Controles obrigatorios

| ID | Requisito | Implementacao atual |
|---|---|---|
| SEC-01 | Autenticacao obrigatoria em rotas protegidas | Proxy de sessao com Supabase |
| SEC-02 | Autorizacao por ownership | Filtros por `profile_id` em queries e APIs |
| SEC-03 | URL de arquivo temporaria | Signed URL com expiracao curta |
| SEC-04 | Validacao de configuracao critica | `lib/env.ts` com schema Zod |
| SEC-05 | Segregacao de privilegio administrativo | Client service role restrito ao server |
| SEC-06 | Mensagens de erro seguras ao usuario | Retorno controlado nas rotas API |

## Riscos e mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Exposicao indevida de documento | Alto | Checagem ownership + signed URL curta |
| Uso de IA com latencia alta | Medio | Timeout operacional e feedback de loading |
| Evolucao de schema sem doc sincronizada | Medio | Regra de atualizar `docs/tipagens/modelagem` junto com migration |

## Especificacoes Web + Mobile (React Native)

## Estado atual

- Produto em producao/desenvolvimento **web-first** (Next.js).
- Nao existe app React Native implementado no repositorio atual.

## Diretriz para cliente mobile React Native

| Tema | Especificacao recomendada |
|---|---|
| Estrategia | Reusar Supabase (Auth/DB/Storage) e APIs ja existentes |
| Escopo inicial | Login, lista de casos, detalhe, leitura de relatorio e download de PDF |
| Escopo fase 2 | Edicao de relatorio e emissao de documentos |
| Offline | Apenas cache local de leitura (sem mutacao offline na fase 1) |
| Design system | Manter semantica visual equivalente a web (tokens e hierarquia) |
| Segurança | Mesmo modelo de ownership por `profile_id` e sessao valida |

## Contratos de API para mobile

| Contrato | Reuso |
|---|---|
| Auth Supabase | Reuso direto |
| Download de PDF por id | Reuso das rotas `/api/*/download` |
| Dados de casos/pacientes | Preferencialmente por modulos expostos via rotas dedicadas (se necessario) |

## Requisitos de deploy (Vercel)

## Parametros de build/runtime

| Item | Requisito |
|---|---|
| Runtime app | Next.js com App Router |
| Build command | `next build` |
| Start command | `next start` |
| External package | `pdfkit` em `serverExternalPackages` |

## Variaveis de ambiente obrigatorias

| Variavel | Obrigatoria |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim |

## Variaveis de ambiente condicionais

| Variavel | Uso |
|---|---|
| `GROQ_API_KEY` | Features de IA |
| `SUPABASE_SERVICE_ROLE_KEY` | Operacoes administrativas server-side |

## Checklist de release tecnico

1. Validar env vars em ambiente de deploy.
2. Executar lint e build sem erro.
3. Validar login/logout e redirecionamentos de sessao.
4. Validar downloads de PDF com conta owner e nao-owner.
5. Validar fluxo de geracao de relatorio com IA.
6. Confirmar sincronia entre schema e docs de modelagem.

## Observabilidade minima recomendada

| Evento | Objetivo |
|---|---|
| Falhas de auth/proxy | Detectar quebras de sessao |
| Erros de signed URL | Detectar regressao em download de documentos |
| Erros de Groq | Medir disponibilidade e latencia de IA |
| Erros de mutacao critica | Priorizar correcoes de impacto clinico |

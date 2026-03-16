# BRD - Business Requirements Document (FALAPED)

## Contexto e justificativa de negocio

O FALAPED resolve uma dor operacional recorrente de pediatras: excesso de trabalho administrativo no WhatsApp, perda de contexto entre conversas e tempo alto para documentacao clinica. O produto nasce com foco em consultorio enxuto (pediatra solo e clinica pequena), onde minutos perdidos por dia impactam agenda, qualidade de seguimento e capacidade de atendimento.

No contexto brasileiro, o WhatsApp ja e canal de trabalho do medico. A estrategia WhatsApp-first reduz friccao de adocao, acelera ativacao e permite entregar valor nas primeiras interacoes sem exigir mudanca radical de rotina.

## Problema de mercado e oportunidade

| Item | Situacao atual de mercado | Oportunidade para FALAPED |
|---|---|---|
| Canal de comunicacao | Alto volume de interacoes clinicas no WhatsApp | Organizar operacao no canal ja adotado |
| Ferramentas existentes | Suites amplas (prontuario/ERP) e bots de secretaria | Posicionar camada operacional do pediatra |
| Dor principal do ICP | Tempo administrativo, retrabalho, contexto fragmentado | Reduzir friccao com fluxo caso/discussao + relatorio |
| Adoção de IA em saude ambulatorial | Crescente, mas heterogenea em pequenas clinicas | Verticalizar pediatria com UX objetiva |
| Ciclo de validacao | Beta inicial com acesso real a usuarios | Converter beta em prova de retencao e receita recorrente |

## Objetivos de negocio (12 meses)

| Objetivo | Meta | Racional |
|---|---|---|
| Provar valor operacional | >=70% dos usuarios ativos reportarem economia de tempo | Suporte a proposta de valor central |
| Provar retencao | Retencao D30 >=55% no segmento solo/clinica pequena | Evita crescimento com churn alto |
| Provar monetizacao | Conversao beta para pago >=35% | Valida willingness to pay |
| Construir previsibilidade comercial | 2 canais de aquisicao replicaveis | Reduz dependencia de rede pessoal |

## ROI e tese economica

## Hipoteses de ROI por conta

| Segmento | Hipotese de ganho de tempo | Valor economico mensal estimado | Ticket sugerido |
|---|---|---|---|
| Pediatra solo | 20-40 min/dia util | 7-14 horas/mes recuperadas | R$ 149-R$ 249 |
| Clinica pequena (2-5 pediatras) | ganho agregado por padronizacao e menos retrabalho | 15-40 horas/mes agregadas (time) | R$ 599-R$ 899 |

Premissas:
- O produto e usado no fluxo real de caso/discussao.
- O valor economico e medido por tempo recuperado e reducao de retrabalho, nao apenas por consultas adicionais.
- O ROI comercial depende de ativacao continua, nao de uso pontual.

## KPIs e metricas de sucesso

## KPI tree

| Pilar | KPI principal | Meta inicial | KPI de apoio |
|---|---|---|---|
| Aquisicao | Novos medicos ativados/mes | >=20 apos beta | CAC por canal, taxa de onboarding concluido |
| Ativacao | % usuarios que iniciam caso ou discussao em ate 7 dias | >=70% | tempo ate primeira resposta util, primeiro relatorio gerado |
| Engajamento | Casos/discussoes por usuario por semana | >=3 interacoes estruturadas/semana | comandos usados, sessoes semanais |
| Retencao | Retencao D30 | >=55% | Retencao D7, churn logo apos onboarding |
| Monetizacao | Conversao para pago | >=35% no cohort beta | ARPA, MRR, inadimplencia |
| Valor percebido | Tempo economizado percebido | >=70% relatam ganho claro | NPS por segmento, CSAT pos-relatorio |

## Criterios de sucesso do negocio

- O medico percebe valor em ate 7 dias de uso.
- O produto sustenta cobranca recorrente sem suporte operacional desproporcional.
- A narrativa comercial principal e "menos trabalho administrativo e mais continuidade clinica", nao "IA por IA".

## Publico-alvo e personas (detalhado)

Observacao de regra de produto: o usuario final e sempre medico/pediatra. Nao ha uso por pais/responsaveis.

## ICP (Ideal Customer Profile)

| Dimensao | ICP atual |
|---|---|
| Tipo de cliente | Pediatra solo ou clinica pequena (ate 5 pediatras) |
| Maturidade digital | Usa WhatsApp como canal principal de rotina |
| Dor principal | Sobrecarga de comunicacao e documentacao |
| Decisao de compra | Rapida, low-touch assistido |
| Horizonte de expansao | Clinicas maiores apos prova de retencao e monetizacao |

## Personas

| Persona | Perfil | Dores | Jobs to be done | Resultado esperado |
|---|---|---|---|---|
| Pediatra solo (principal) | 1 medico, agenda cheia, pouca equipe de apoio | perda de contexto, retrabalho, tempo para relatorio | organizar conversa clinica, encerrar/retomar caso, gerar relatorio rapido | reduzir carga administrativa diaria |
| Coordenador clinico (decisor) | Clinica pequena, 2-5 pediatras | padrao de atendimento inconsistente, visao fragmentada | padronizar operacao minima e acompanhar uso do time | ganho de eficiencia e menos ruído operacional |
| Pediatra associado (usuario secundario) | Atua em clinica com fluxo misto | precisa rapidez sem curva longa de adocao | usar comandos claros no WhatsApp e manter continuidade do caso | atendimento mais fluido com menos friccao |

## Analise de concorrentes

## Mapa competitivo (resumo)

| Grupo | Exemplos | Forca principal | Limitacao para ICP FALAPED |
|---|---|---|---|
| Bot de clinica/secretaria | CPBot, Iara, Auraclin | automacao de atendimento e agenda | foco menor no workflow clinico do pediatra |
| Suite clinica/prontuario | iClinic, Conclinica, Easy Clinic, Clinicia | escopo amplo (ERP+prontuario) | maior complexidade para consultorio enxuto |
| Assistente WhatsApp internacional | Medivice, AwaDoc | experiencia conversacional | menor aderencia ao contexto local BR e jornada pediatrica |

## Diferencial competitivo desejado

| Eixo | Posicionamento FALAPED |
|---|---|
| Vertical | Pediatria (nao horizontal para todas especialidades) |
| Canal | WhatsApp-first com camada web complementar |
| Valor | Organizacao operacional + documentacao clinica mais rapida |
| Adoção | baixo atrito para medico que ja trabalha no WhatsApp |

## Modelo de monetizacao (B2B2C SaaS)

## Estrutura de monetizacao proposta

| Camada | Descricao |
|---|---|
| B2B | venda para medico/clinica como cliente pagante |
| B2C indireto | impacto no atendimento final ao paciente por maior continuidade e velocidade |
| Receita | assinatura mensal recorrente por conta/plano |
| Expansao | upsell de solo para clinica pequena (assentos e gestao) |

## Faixas de precificacao para validacao

| Plano | Preco sugerido | Publico |
|---|---|---|
| Beta Founder Solo | R$ 149-R$ 199/mes | pediatra solo em validacao inicial |
| Solo Standard | R$ 249/mes | solo com uso continuo |
| Clinica Pequena | R$ 599-R$ 899/mes | ate 5 pediatras |

## Riscos de negocio e mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Falha em provar valor mensuravel | baixa conversao e churn | instrumentar tempo economizado + ativacao/retencao |
| Pressao competitiva por suites maiores | comparacao de preco sem contexto | reforcar posicionamento operacional especializado |
| Exigencias legais e LGPD | risco reputacional e compliance | governanca de dados, logs e politicas claras |
| Crescimento de escopo precoce | perda de foco no ICP | priorizacao disciplinada no nicho solo/clinica pequena |

## Decisoes de negocio para o proximo ciclo

1. Converter os 10 pediatras beta em evidencia de ativacao, retencao e willingness to pay.
2. Operar com poucos planos e proposta de valor objetiva.
3. Adiar expansao para segmentos maiores ate consolidar repetibilidade comercial no ICP atual.

# BRD — FALAPED (Business Requirements Document)

## Contexto de negócio

O FALAPED resolve um problema operacional recorrente em pediatria no Brasil: o atendimento por WhatsApp gera alto volume de conversa, pouca padronizacao de registro clinico e retrabalho para transformar conversa em documento medico formal.

Hoje, o produto ja cobre o fluxo fim a fim para o pediatra:

- Captura de atendimentos (casos) originados no WhatsApp.
- Gestao de pacientes pediatricos e vinculacao ao caso.
- Geracao e edicao de relatorio do atendimento com apoio de IA.
- Emissao de atestados e receitas com PDF.

## Problema de mercado e oportunidade

## Problema

| Problema | Impacto na operacao da clinica | Consequencia de negocio |
|---|---|---|
| Conversas clinicas em canais informais (WhatsApp) | Informacao dispersa e sem estrutura | Baixa escalabilidade do medico |
| Documentacao manual (relatorio/receita/atestado) | Tempo alto por atendimento | Menor capacidade de atendimentos por dia |
| Falta de rastreabilidade por caso e paciente | Risco de perda de contexto clinico | Queda de qualidade percebida e risco juridico |
| Ferramentas generalistas de clinica | Fluxo pouco aderente ao pediatra digital-first | Adocao parcial e churn |

## Oportunidade

- Especializacao vertical em pediatria com foco em "atendimento por conversa".
- Diferenciacao por fluxo WhatsApp-first + producao automatizada de documento clinico.
- Produto orientado a produtividade medica com monetizacao recorrente SaaS.

## Justificativa de negocio

## Tese

Se o pediatra reduzir tempo administrativo por caso e aumentar previsibilidade do registro clinico, ele aumenta capacidade de atendimento sem ampliar proporcionalmente custo fixo da operacao.

## Motores de valor

| Motor | Mecanismo no FALAPED | Resultado esperado |
|---|---|---|
| Produtividade | IA para relatorio por secao + templates + reuso de dados | Menos tempo por caso |
| Padronizacao | Estrutura unica por caso/paciente/documento | Melhor consistencia de qualidade |
| Receita indireta | Mais capacidade da agenda e menor atraso de documentacao | Mais atendimentos faturaveis |
| Retencao | Alto custo de troca (historico + templates + fluxo operacional) | Menor churn mensal |

## ROI (modelo de referencia)

## Formula

`ROI mensal (%) = ((ganho_de_produtividade + ganho_de_receita - custo_saas) / custo_saas) * 100`

## Exemplo pratico (clinica pediatrica pequena no BR)

Hipoteses de referencia (ajustar com dados reais do cliente):

- 1 pediatra.
- 120 casos/mes.
- Reducao media de 10 minutos administrativos por caso.
- 20 horas/mes recuperadas.
- Custo-hora medico administrativo estimado: R$ 250.
- Valor economico recuperado: R$ 5.000/mes.
- Faixa de assinatura alvo: R$ 149 a R$ 249 por medico/mes.

Resultado indicativo:

- ROI bruto estimado: entre `1908%` e `3256%` ao mes (antes de impostos e custos de implantacao).

Observacao: o exemplo e um benchmark de decisao comercial. O ROI contratado deve ser medido por cohort real de usuarios pagantes.

## KPIs e metricas de sucesso

## North Star

**Casos finalizados com documentacao completa por medico/mes**

## KPIs de negocio e produto

| KPI | Formula | Meta inicial (90 dias) | Baseline inicial sugerido |
|---|---|---|---|
| Conversao para conta vinculada no WhatsApp | `contas_vinculadas / contas_cadastradas` | >= 70% | Medir no primeiro ciclo |
| Conversao para conta paga | `contas_paid / contas_vinculadas` | >= 25% | Medir no primeiro ciclo |
| Adocao de relatorio IA | `casos_com_relatorio / casos_totais` | >= 60% | Medir no primeiro ciclo |
| Tempo medio de fechamento do caso | `soma(tempo_ate_is_finalized) / casos_finalizados` | -30% vs baseline | Baseline por 4 semanas |
| Adocao de documentos clinicos | `(receitas + atestados) / casos_totais` | >= 35% | Medir no primeiro ciclo |
| Retencao de logo prazo (MRR logo) | `MRR_fim_mes / MRR_inicio_mes (mesma base)` | >= 90% | Medir a partir do M2 |

## Publico-alvo detalhado (personas)

## Persona 1 — Pediatra autonomo (core ICP)

| Item | Descricao |
|---|---|
| Perfil | Pediatra que atende no consultorio e no WhatsApp |
| Objetivo | Ganhar velocidade sem perder qualidade tecnica |
| Dor principal | Retrabalho para registrar e formalizar conduta |
| Gatilho de compra | Tempo perdido e aumento de volume de atendimento |
| Criterio de valor | "Menos tempo digitando, mais tempo atendendo" |

## Persona 2 — Clinica pediatrica de pequeno porte (2-10 medicos)

| Item | Descricao |
|---|---|
| Perfil | Operacao com equipe medica e secretaria |
| Objetivo | Padronizar qualidade e reduzir variacao entre medicos |
| Dor principal | Fluxos heterogeneos e baixa governanca de documentos |
| Gatilho de compra | Necessidade de escala com controle operacional |
| Criterio de valor | Padrao unico de processo + visibilidade por medico |

## Persona 3 — Secretaria/operacao (influenciadora)

| Item | Descricao |
|---|---|
| Perfil | Responsavel por apoio administrativo e organizacao |
| Objetivo | Acelerar rotina e reduzir pendencias de documentos |
| Dor principal | Falta de rastreabilidade de status por caso |
| Gatilho de adocao | Fluxo claro para localizar, baixar e enviar documentos |
| Criterio de valor | Menos follow-up manual com o medico |

## Analise de concorrentes (Brasil)

## Leitura estrategica

O FALAPED nao compete somente com prontuario/agenda generalista. Ele compete por "produtividade clinica em atendimentos conversacionais", especialmente em pediatria.

| Player | Foco principal | Forca | Lacuna para FALAPED explorar |
|---|---|---|---|
| iClinic | Gestao de consultorio + prontuario + agenda | Suite completa para clinicas gerais | Menor especializacao em fluxo WhatsApp-first pediatrico |
| Feegow | ERP clinico robusto, financeiro, TISS, telemedicina | Amplitude de modulos e escala | Mais orientado a operacao ampla que a jornada conversacional pediatrica |
| Doctoralia Pro | Marketplace + agenda + aquisicao de pacientes | Forte canal de descoberta e agendamento | Nao e focado em estrutura de caso clinico via WhatsApp |
| Ninsaude | Plataforma de gestao para clinicas e franquias | Personalizacao por especialidade e CRM | Menor foco explicito em "caso por conversa" com IA por secao |
| FALAPED | Casos pediátricos via WhatsApp + IA documental | Profundidade no fluxo real do pediatra digital | Precisa ampliar distribuicao comercial e prova de ROI em escala |

## Modelo de monetizacao (B2B2C SaaS)

## Estrutura

| Camada | Papel no modelo | Exemplo no FALAPED |
|---|---|---|
| B2B (cliente pagante) | Pediatra ou clinica contrata assinatura | Assinatura mensal por medico/perfil |
| B2C (beneficiario indireto) | Responsavel da crianca recebe melhor experiencia e tempo de resposta | Menor espera por retorno, receita e atestado |
| Plataforma | Coordena dados, workflow e documentos | Caso -> paciente -> relatorio/receita/atestado |

## Proposta de pricing inicial (diretriz de negocio)

| Plano | Ticket sugerido | Publico | Objetivo |
|---|---|---|---|
| Start | R$ 149/mes por medico | Pediatra autonomo | Baixa barreira de entrada |
| Pro | R$ 229/mes por medico | Pediatra com maior volume | Capturar valor de produtividade |
| Clinic | Sob proposta (volume) | Clinicas com multiprofissionais | Expandir MRR em contas B2B |

## Premissas e riscos de negocio

| Premissa | Risco se nao confirmar | Mitigacao |
|---|---|---|
| Pediatras priorizam produtividade sobre "suite completa" | Perda para ERPs generalistas | Reforcar diferenciacao por caso conversacional e IA aplicada |
| Vinculacao WhatsApp sustenta ativacao | Queda na conversao inicial | Melhorar onboarding guiado e suporte nos primeiros 7 dias |
| Ticket entre R$ 149-R$ 249 tem boa aceitacao | CAC payback piora | Testar ofertas semestrais/anuais e prova de valor em 14 dias |
| Fluxo documental e killer feature | Uso restrito a cadastro/listagem | Instrumentar eventos e otimizar UX de geracao/finalizacao |

## Decisoes de negocio para o proximo ciclo

1. Priorizar ICP: pediatra autonomo e clinica pediatrica ate 10 medicos.
2. Operar growth com tese "economia de tempo por caso" como mensagem principal.
3. Estruturar funil por estagios: cadastro -> vinculacao WhatsApp -> conta paid -> uso recorrente de relatorio.
4. Revisar pricing apos 60 dias de dados de cohort paga.

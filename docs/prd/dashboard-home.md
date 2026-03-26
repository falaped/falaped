# PRD — Tela Início do dashboard (`/dashboard`)

**Versão:** 1.1  
**Data:** 2026-03-26  
**Status:** em evolução (refino pós-feedback)  
**Discovery:** [dashboard-home-discovery.md](./dashboard-home-discovery.md)

---

## 1. Visão e contexto

A rota `/dashboard` é a **entrada autenticada** do FALAPED após o login. Hoje ela é um placeholder visual. Este PRD define a **evolução da Início**: hub operacional com **um único caso ativo** em destaque (regra de negócio do produto), **números da conta** (pacientes, histórico de casos, receitas, atestados) e **últimos casos encerrados**. Vinculação de WhatsApp **não** é promovida nesta tela (fluxo permanece em `/dashboard/link-whatsapp` e demais entradas). Sem “dashboard analítico” pesado (Could Have no PRD baseline).

## 2. Problema e oportunidade

**Dor:** o pediatra chega ao app e não vê **o caso em andamento** nem **volume de documentos/cadastros** de forma imediata.

**Oportunidade:** um **card de caso ativo** rico em contexto (paciente, canal, mensagens, relatório), **métricas de conta** (pacientes, casos, receitas, atestados) e **histórico curto de encerrados**. Navegação secundária permanece na sidebar.

**Evidência:** lacuna explícita no PRD baseline — Fluxo 1 não descreve o conteúdo da landing autenticada.

## 3. Objetivos e métricas de sucesso

| Objetivo | Como medir |
|----------|------------|
| Reduzir fricção até o fluxo principal | Pediatra abre o caso ativo em 1 clique quando existir |
| Ampliar utilidade da Início | Uso qualitativo dos blocos “Números da conta” e “Últimos encerrados” |
| Não degradar performance | Leitura em linha com RNF-03 (&lt; ~2s típico); consultas em paralelo + contagens `head` |

## 4. Personas / atores

- **Pediatra autenticado** — único ator da tela; vê apenas dados do próprio `profile_id`.

## 5. Escopo

### Dentro do escopo (MVP atual)

- **Caso ativo (0 ou 1):** card em destaque com paciente/responsável/contato, origem (Painel/WhatsApp), início e última mensagem, contagem de mensagens, estado do relatório do atendimento (`case_reports` mais recente), `pending_action` e resumo de contexto do painel quando existirem.
- **Contagens (números da conta):** pacientes; total de casos + encerrados (subtítulo); receitas; atestados.
- **Últimos casos encerrados:** até 5, por `ended_at` decrescente, com link para a ficha.
- **Estados:** skeleton; empty state quando não há caso ativo; empty na tabela de encerrados.

### Fora do escopo

- Banner de vinculação WhatsApp na Início (fluxo específico em outra rota).
- Gráficos, rankings, KPIs de produtividade agregados no tempo.
- Feed de atividades global, notificações push.
- Lista de múltiplos casos ativos (incompatível com regra de negócio: um ativo por usuário).

## 6. Requisitos funcionais

| ID | Requisito |
|----|-----------|
| RF-DH-01 | Quando existir caso com `status = active` para o `profile_id` do pediatra, o sistema deve exibir um card em destaque com dados do caso, paciente associado (se houver), origem, linha do tempo, mensagens, estado do relatório mais recente e CTA “Abrir caso”. |
| RF-DH-02 | O sistema deve exibir contagens: pacientes; total de casos e casos encerrados; receitas; atestados. |
| RF-DH-03 | O sistema deve listar até cinco casos encerrados recentes (`ended_at` desc) com paciente/responsável, data de encerramento e link para `/dashboard/cases/[id]`. |
| RF-DH-04 | Navegação global para outras áreas (discussões, templates, etc.) permanece na sidebar; a Início não duplica essa navegação em faixa de atalhos. |
| RF-DH-05 | Quando não houver caso ativo, o sistema deve exibir empty state com CTAs para criar caso ou ver histórico. |

## 7. Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF-DH-01 | Dados carregados apenas no servidor (RSC), sem chamadas Supabase em componentes cliente. |
| RNF-DH-02 | Consultas agregadas de forma a evitar N+1 desnecessário (preferir contagens `head: true` + uma query de lista curta). |
| RNF-DH-03 | Interface responsiva; contraste e foco visível conforme design system (Shadcn/Radix). |
| RNF-DH-04 | Textos de interface em PT-BR; identificadores de código em inglês. |

## 8. Fluxos e estados

### Fluxo feliz

1. Pediatra autentica e cai em `/dashboard`.
2. Se houver caso ativo → card em destaque com contexto clínico-administrativo e “Abrir caso”.
3. Vê “Números da conta” e tabela dos últimos encerrados; navega para detalhe ou usa a sidebar para outras áreas.

### Estados

- **Loading:** skeleton (cabeçalho, card de caso, grid de métricas, tabela).
- **Erro de dados:** boundary/segmento.
- **Sem caso ativo:** empty tracejado com CTAs.
- **Sem encerrados:** mensagem na área da tabela.

### Brief de design UX (integrado)

**Objetivo da experiência:** “ponto de controle” profissional; hierarquia: **caso ativo** (quando existir) acima das métricas agregadas.

**Wireframe textual (desktop)**

1. Cabeçalho “Início” + descrição (muted).
2. **Card caso em andamento** (`border-primary` sutil): título, badge origem, grid paciente/responsável/timeline, badges mensagens + relatório, opcional pendência/resumo, CTA Abrir.
3. Seção **Números da conta:** grid responsivo de cards (pacientes, histórico de casos, receitas, atestados).
4. **Últimos casos encerrados:** card com tabela + “Ver todos os casos”.

**Componentes sugeridos:** `Card`, `Button`, `Table`, `Skeleton`, `Separator` (de `@/components/ui/*`).

**Anti-padrões:** cores hex soltas; duplicar a tabela completa da página Casos; animações chamativas.

## 9. Dados e integrações

- **Tabelas:** `cases`, `patients`, `case_messages`, `case_reports`, `prescriptions`, `medical_certificates` (contagens por `profile_id` onde aplicável).
- **Módulo:** `modules/dashboard/get-dashboard-home-data.ts` (cliente Supabase como primeiro argumento; consultas em paralelo; subconsultas do caso ativo apenas quando existir linha ativa).
- **Sem** integrações novas externas.

## 10. User stories e critérios de aceite

### US-DH-01 — Caso em andamento na Início

**Como** pediatra **quero** ver o meu caso ativo com contexto **para** retomar o atendimento sem procurar na lista.

**Critérios:**

- Dado exatamente um caso `active` (regra do produto), quando abro `/dashboard`, então vejo card com paciente, responsável, contato, origem, datas, contagem de mensagens, estado do relatório e CTA para a ficha.
- Dado caso sem paciente associado, quando exibido, então vejo indicação clara e layout íntegro.
- Dado nenhum caso ativo, quando abro `/dashboard`, então vejo empty state com CTAs.

### US-DH-02 — Números da conta

**Como** pediatra **quero** ver totais de cadastros e documentos **para** situar minha operação.

**Critérios:**

- Quando abro `/dashboard`, então vejo contagens coerentes com as áreas correspondentes (pacientes, casos, receitas, atestados).

### US-DH-03 — Últimos casos encerrados

**Como** pediatra **quero** acessar encerramentos recentes **para** reabrir ficha ou conferir histórico rápido.

**Critérios:**

- Quando existem casos encerrados, vejo até 5 com data de encerramento e link para o detalhe.
- Quando não há encerrados, vejo mensagem explicativa.

### US-DH-04 — Navegação sem duplicar a sidebar

**Como** pediatra **quero** uma Início focada em resumo **para** não competir com a sidebar.

**Critérios:**

- Quando abro `/dashboard`, então **não** há faixa de botões de atalho replicando rotas da sidebar; CTAs permanecem no caso ativo, empty states e “Ver todos os casos”.

## 11. Priorização

| Item | MoSCoW |
|------|--------|
| Card caso ativo + métricas de conta + encerrados | **Must** |
| Saudação com nome do médico | **Could** |
| Indicadores adicionais (ex.: alertas clínicos) | **Could** / **Should** (definir regra) |

**Ordem de entrega sugerida:** módulo de dados → conteúdo RSC → skeleton → revisão de copy.

## 12. Riscos, gargalos e premissas

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Queries paralelas lentas | Médio | Contagens com `head: true`; limit 5 em encerrados; subconsultas só se houver caso ativo |
| `pending_action` ou resumo muito longos | Baixo | Truncar / scroll em bloco monoespaçado |
| Usuário confunde Início com lista completa de Casos | Baixo | Copy “Ver todos os casos” explícita |

**Premissas:** ver [dashboard-home-discovery.md](./dashboard-home-discovery.md).

## 13. Plano de rollout

- Entrega direta em produção sem feature flag (escopo de leitura apenas).
- Sem migração de dados.

## 14. Perguntas em aberto

- Ver seção “Perguntas em aberto” em [dashboard-home-discovery.md](./dashboard-home-discovery.md).

---

## Referência cruzada

- PRD baseline: [docs/analise-falaped/prd.md](../analise-falaped/prd.md)

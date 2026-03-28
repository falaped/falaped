# Discovery v2 — valor na ficha do caso (`/dashboard/cases/[id]`)

**Data:** 2026-03-26  
**Skills:** feature-planning-agile-po, creative-director-falaped  
**Objetivo:** traduzir **jobs do pediatra** em decisões de hierarquia, modo de tela e diferenciação em relação à home — sem depender só de reordenar cards.

---

## 1. Jobs priorizados (até 3)

| Ordem | Job | O que a tela deve facilitar |
|-------|-----|-----------------------------|
| 1 | **Retomar ou acompanhar o atendimento** | Saber o canal (painel vs WhatsApp), acessar conversa com assistente no painel quando aplicável, ver última atividade. |
| 2 | **Fechar ou revisar o relatório do caso** | Acesso direto ao bloco de relatório (gerar, editar, PDF) com menos scroll em desktop. |
| 3 | **Contexto clínico rápido + cadastro** | Resumo do painel **legível** (sem JSON), paciente associado, links para receitas/atestados/ficha. |

**Premissa:** o input de chat na própria ficha continua fora de escopo; o fluxo real de conversa no painel é a rota `app/dashboard/cases/new/[caseId]`.

---

## 2. Caso ativo vs encerrado (cockpit vs arquivo)

| Estado | Modo percebido | Comportamento de UI |
|--------|----------------|---------------------|
| **Ativo** | Cockpit | Faixa de comando com CTA para retomar no painel (origem painel); destaque sutil (`border-primary/25`). Chat expandido por padrão. Copy orientada à ação. |
| **Encerrado** | Arquivo / leitura | Faixa informativa (sem CTA de retomada). Chat recolhido por padrão. Copy enfatiza consulta a histórico e relatório. |

---

## 3. Duplicação com a home (“Caso em andamento”)

- A **home** continua sendo o resumo executivo (um cartão rico com grid paciente/responsável/timeline).
- Na **ficha**, o bloco de visão do caso é **complementar**: linha do tempo compacta + métricas (canal, mensagens, relatório) + resumo do painel sanitizado — não replica o layout completo da home.

---

## 4. Chat sem input na ficha

- Exibir na **faixa de comando** (origem painel + ativo) o link **“Abrir conversa no painel”** → `/dashboard/cases/new/[caseId]`.
- Origem WhatsApp: mensagem clara de que a conversa ocorreu/fora pelo WhatsApp; histórico permanece na seção Conversa abaixo.

---

## 5. Wireframe textual (blocos)

1. Cabeçalho (título, status, datas, ações existentes: associar paciente, encerrar, voltar).  
2. `Separator`.  
3. **Faixa de comando** (card, modo ativo/arquivo).  
4. **Visão do caso**: timeline horizontal (início → última mensagem → relatório) + área de resumo do painel (só se texto sanitizado existir).  
5. Card paciente.  
6. **Desktop `lg+`:** duas colunas — coluna 1 conversa, coluna 2 relatório + links relacionados; **mobile:** coluna única (conversa → relatório → links).  
7. (Links ficam na coluna do relatório em `lg+` para manter “documentos” junto da produção clínica.)

---

## 6. Decisões fechadas para o PRD v2

- Adotar **faixa de comando + timeline + grid 2 colunas em `lg+`** como pacote de “criatividade contida” mantendo tokens Shadcn e identidade minimalista.  
- **Resumo do painel:** não exibir se ainda houver artefatos `__FALAPED_JSON__` após normalização (ver módulo `format-dashboard-chat-context-summary-for-display`).

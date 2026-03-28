# Discovery — Ficha do caso (`/dashboard/cases/[id]`)

**Status:** premissas para execução (alinhado ao plano de refactor UX).

## Premissas — produto (PO)

| # | Premissa |
|---|----------|
| P1 | Prioridade na ficha: **ler contexto** (estado, paciente, conversa) e **agir** no relatório e encerramento; receitas/atestados são fluxos **secundários** com atalho para rotas já existentes. |
| P2 | **Caso ativo:** conversa **aberta por padrão** para leitura imediata. **Caso encerrado:** conversa **fechada por padrão** para reduzir scroll; o pediatra expande se precisar. |
| P3 | **CaseQuickActions** com botões falsos é removido; substituído por **links reais** (listagens e wizards de receita/atestado, ficha do paciente quando houver). |
| P4 | **Bloco de estado do caso** (canal, mensagens, relatório) agrega valor sem nova query — dados já carregados em `CaseDetailContent`. |
| P5 | **Resumo do painel** (`dashboard_chat_context_summary`): exibir trecho formatado **apenas** se preenchido e origem `dashboard`, usando `formatDashboardChatContextSummaryForDisplay`. |

## Premissas — UX (Creative Director)

| # | Premissa |
|---|----------|
| U1 | Anatomia alinhada a **Casos**, **Pacientes** e **Início**: `flex flex-col gap-6`, `Separator` após cabeçalho, ícone + `h1` + subtítulo, tokens Shadcn. |
| U2 | Secções com `Card` + títulos claros; landmarks implícitos via headings. |
| U3 | Copy em PT-BR; termos paciente/responsável/caso (`audience-context`). |

## Perguntas em aberto (iteração futura)

- Atalho “Nova receita” com `patientId`/`caseId` pré-preenchido via query string (requer suporte nos wizards).
- Pin de mensagem ou filtros na conversa.

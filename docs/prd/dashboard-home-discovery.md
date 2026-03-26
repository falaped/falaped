# Discovery — Tela Início (`/dashboard`)

**Status:** premissas documentadas (discovery síncrono com stakeholders adiado; alinhado ao plano aprovado e ao PRD baseline em `docs/analise-falaped/prd.md`).

## Skip explícito de rodada ao vivo

Não houve workshop com pediatra nesta entrega. As decisões abaixo são **premissas de produto e UX** para viabilizar o MVP da Início; devem ser validadas em uso real e ajustadas no PRD principal se necessário.

## Premissas — produto (PO)

| # | Premissa |
|---|----------|
| P1 | O valor principal da Início é **reduzir o tempo até a próxima ação útil** e dar **visão da operação** (documentos, cadastros), sem substituir listagens completas. |
| P2 | **Métricas analíticas avançadas** permanecem fora do escopo (Could Have no PRD baseline). |
| P3 | **Vincular WhatsApp** não é promovido na Início; o fluxo permanece em `/dashboard/link-whatsapp` e outras entradas. |
| P4 | Existe **no máximo um caso ativo** por usuário; a Início mostra **um card** desse caso (se existir), não uma tabela de vários ativos. |
| P5 | Contagens usam `profile_id` (e `user_id` em `report_templates` = `auth_user_id` do perfil). |
| P6 | **Últimos encerrados:** até **5** casos `closed`, por `ended_at` decrescente. |
| P7 | “Casos sem relatório finalizado” como lista global fica para **fase 2**; na Início apenas o estado do relatório do **caso ativo**. |

## Premissas — UX (Creative Director)

| # | Premissa |
|---|----------|
| U1 | Hierarquia: **caso ativo** (se existir), **números da conta**, **últimos encerrados**; sem faixa de atalhos duplicando a sidebar. |
| U2 | Reutilizar padrão de página: `h1` + descrição `text-muted-foreground`, `gap-6`, tokens Shadcn (sem cores soltas). |
| U3 | Estados: **loading** com skeleton; **lista vazia** com empty state tracejado + link para Casos; erro propagado (boundary/route). |
| U4 | Mobile: grid de cards empilhável; tabela de casos recentes com scroll horizontal se necessário. |
| U5 | Copy em PT-BR, termos: paciente, responsável, caso (audience pediátrica). |

## Perguntas em aberto (para validação futura)

1. Deve a Início exibir o **nome do médico** ou saudação personalizada?
2. Há necessidade de **destaque para discussões clínicas** recentes na mesma tela?
3. Critério comercial: `status` em `authenticated_users` (`paid` / `unpaid`) deve bloquear conteúdo além do banner de WhatsApp?

---

**Relacionado:** [dashboard-home.md](./dashboard-home.md) (PRD + brief de UX integrado).

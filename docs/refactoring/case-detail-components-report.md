# Relatório de Refatoração — `components/dashboard/cases/` (ficha do caso)

**Escopo:** componentes da rota `/dashboard/cases/[id]` e peças diretamente ligadas.  
**Data:** 2026-03-27  
**Status:** executado após este relatório (aprovação implícita no pedido de implementação do plano).

## Resumo

| Métrica | Valor |
|---------|-------|
| Arquivos analisados | ~12 |
| Findings tratados nesta entrega | UI alto, STR/REA médio |

## Findings

| ID | Cat | Sev | Descrição | Ação nesta entrega |
|----|-----|-----|-----------|-------------------|
| F1 | UI | Alto | `CaseQuickActions` com ações majoritariamente `disabled` e “em breve” | Removido; substituído por `CaseDetailRelatedLinks` com `Link` reais |
| F2 | STR | Médio | `CaseDetailContent` apenas compõe blocos; cabeçalho misturava `Separator` interno | `Separator` na página; novo `CaseDetailStateCard` |
| F3 | REA | Médio | Cabeçalho da ficha diferente de `patient-detail-view` / lista Casos | `CaseDetailHeader` alinhado (ícone, subtítulo, Voltar outline) |
| F4 | UI | Médio | `CasePatientInfo` sem título de card com nome do paciente | `CardHeader` + nome + descrição |
| F5 | UX | Médio | Chat sempre colapsado por padrão | `initiallyOpen={isActive}` |
| F6 | PAT | — | Supabase permanece em módulos/RSC | Sem alteração |

## Fora do escopo desta entrega

- Habilitar `Input`/`send` do chat na ficha.
- Refator interno grande de `case-report.tsx` (apenas encaixe na página).

## Checklist pós-refatoração

- [x] Remover import morto de `CaseQuickActions` se arquivo deletado
- [x] ESLint nos arquivos alterados
- [x] Atualizar skill `dashboard-falaped` se árvore mudar

---

## Anexo v2 (2026-03-26) — valor, layout, resumo

**PRD:** [docs/prd/case-detail-redesign-v2.md](../prd/case-detail-redesign-v2.md)

| ID  | Cat | Sev | Descrição | Ação |
|-----|-----|-----|-----------|------|
| V2-1 | VAL | Alto | Resumo do painel ainda podia exibir `__FALAPED_JSON__` quando `assistantMessageToModelText` falhava no parse | `stripFalapedJsonFromSummaryText` + regra final em `formatDashboardChatContextSummaryForDisplay`; testes em `format-dashboard-chat-context-summary-for-display.spec.ts` |
| V2-2 | STR | Médio | Página sem shell nomeado para grid 2 colunas | `CaseDetailWorkspaceTwoColumn` em `case-detail-workspace.tsx` |
| V2-3 | UX | Médio | Pediatra não via atalho para workspace de conversa no painel | `CaseDetailCommandStrip` (CTA condicional origem + status) |
| V2-4 | UX | Médio | Timeline e modo ativo/arquivo pouco explícitos | `CaseDetailTimeline` + copy no `CaseDetailHeader` por status |
| V2-5 | REA | Baixo | Loading não refletia colunas `lg` | `CaseDetailLoading` com grid duas colunas no bloco chat/relatório |

# PRD v2 — Ficha do caso: valor, layout e resumo legível

**Versão:** 2.0  
**Data:** 2026-03-26  
**Discovery:** [case-detail-value-discovery-v2.md](./case-detail-value-discovery-v2.md)  
**Base:** [case-detail-redesign.md](./case-detail-redesign.md) (v1 — consistência e placeholders)

---

## 1. Visão

Evoluir a ficha do caso para um **modo de trabalho** distinto: cockpit (ativo) vs arquivo (encerrado), **próximo passo explícito** (incluindo link para conversa no painel), **leitura em duas colunas** em telas grandes (conversa + relatório) e **resumo do painel sem vazamento de JSON**.

## 2. Objetivos de valor (mensuráveis na revisão)

| ID | Objetivo | Critério de aceite |
|----|----------|-------------------|
| OV-01 | Próxima ação óbvia em caso ativo (painel) | Em até um clique a partir do topo da página: link “Abrir conversa no painel” visível na faixa de comando. |
| OV-02 | Menos scroll até o relatório em desktop | Em viewport `lg+`, relatório visível na mesma altura inicial que a conversa (grid duas colunas). |
| OV-03 | Resumo clínico confiável | Nenhum texto exibido ao usuário contendo o literal `__FALAPED_JSON__`; se não for possível sanitizar, ocultar o bloco ou mostrar mensagem curta PT-BR. |
| OV-04 | Modo arquivo claro | Caso encerrado: copy e faixa sem CTA de retomada; chat recolhido por padrão. |

## 3. Escopo

### Dentro

- `CaseDetailCommandStrip` (faixa de comando).  
- `CaseDetailTimeline` + integração na visão do caso (`CaseDetailStateCard` ou composição equivalente).  
- `CaseDetailWorkspaceTwoColumn` (layout `lg:grid-cols-2`).  
- Ajuste de subtítulo em `CaseDetailHeader` por status.  
- Endurecimento de `formatDashboardChatContextSummaryForDisplay` + testes.  
- Skeleton de loading alinhado ao grid duas colunas.  
- Atualização do relatório de refatoração e da skill `dashboard-falaped`.

### Fora

- Habilitar envio de mensagens na própria ficha `/cases/[id]`.  
- Pré-preencher wizards de receita/atestado com `case_id`.  
- Alterar regras de negócio de `CaseReport` (geração, PDF, RLS).

## 4. Requisitos funcionais

| ID | Requisito |
|----|-----------|
| RF-V2-01 | Caso **ativo** e origem **painel**: exibir faixa de comando com link para `/dashboard/cases/new/[caseId]`. |
| RF-V2-02 | Caso **ativo** e origem **whatsapp**: faixa informa canal WhatsApp; sem link para workspace de painel. |
| RF-V2-03 | Caso **encerrado**: faixa informativa (arquivo); sem CTA “Abrir conversa no painel”. |
| RF-V2-04 | Em `lg+`, conversa e relatório em duas colunas; abaixo deles, na coluna do relatório, links de documentos/cadastros. |
| RF-V2-05 | Timeline compacta: início do caso, última mensagem (relativo), estado do relatório. |
| RF-V2-06 | `formatDashboardChatContextSummaryForDisplay` não retorna string contendo `__FALAPED_JSON__`; casos irrecuperáveis retornam `null`. |

## 5. Requisitos não funcionais

- Tokens semânticos; componentes Shadcn; PT-BR na UI; logs/código em inglês.  
- Sem novas queries Supabase em componentes cliente além do existente.  
- Testes unitários (`node:test`) no módulo do formatador.

## 6. User stories

- **US-V2-1:** Como pediatra com caso ativo no painel, quero um atalho claro para a conversa com o assistente para não procurar a rota manualmente.  
- **US-V2-2:** Como pediatra em desktop largo, quero ver conversa e relatório lado a lado para revisar e editar com menos rolagem.  
- **US-V2-3:** Como pediatra, quero que o resumo do painel não mostre lixo técnico para confiar na leitura rápida.  
- **US-V2-4:** Como pediatra com caso encerrado, quero entender que estou em modo leitura e focar no relatório/histórico.

## 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| `CaseReport` alto demais em coluna estreita | `min-w-0`, scroll interno já existente no cliente preservado. |
| Regressão no strip de JSON | Testes com payloads válidos, inválidos e truncados. |

## 8. Brief UX (resumo)

Identidade: mesma linguagem Vercel/Supabase (cards, `gap-6`, tipografia). Inovação: **comando + timeline + bifurcação desktop** sem novas cores além de acento primary já usado na home para caso ativo.

# PRD — Redesign da ficha do caso (`/dashboard/cases/[id]`)

**Versão:** 1.0  
**Data:** 2026-03-27  
**Discovery:** [case-detail-discovery.md](./case-detail-discovery.md)

---

## 1. Visão e contexto

Padronizar a ficha do caso ao **padrão visual das demais páginas do dashboard** (cabeçalho com ícone, título, subtítulo, `Separator`), melhorar **hierarquia de informação** e **eliminar ações placeholder**. Incluir um **bloco de estado do caso** (canal, conversa, relatório) para leitura rápida.

## 2. Problema e oportunidade

**Dor:** layout inconsistente com outras fichas; chat colapsado por padrão em caso ativo; `CaseQuickActions` gera expectativa falsa.

**Oportunidade:** menos fricção até relatório e histórico; links honestos para documentos; estado do caso visível sem abrir o chat.

## 3. Objetivos e métricas

| Objetivo | Critério |
|----------|----------|
| Consistência visual | Cabeçalho e `gap-6` alinhados a Casos/Pacientes/Início |
| Valor percebido | Bloco de estado + links reais substituindo placeholders |
| Regressão zero | Envio de mensagem/relatório/PDF inalterados em comportamento |

## 4. Personas

- Pediatra autenticado, dono do caso (`profile_id`).

## 5. Escopo

### Dentro

- Refatorar cabeçalho, ordem visual, card de estado, paciente com header de card, chat default open/closed, card de links relacionados.
- Loading skeleton atualizado.

### Fora

- Habilitar input de chat na ficha (continua “em breve” onde já estava).
- Query params para pré-preencher wizard de receita/atestado com `case_id`.

## 6. Requisitos funcionais

| ID | Requisito |
|----|-----------|
| RF-CD-01 | A página deve exibir cabeçalho com ícone, título do caso (paciente ou fallback), subtítulo descritivo e botão Voltar para a lista de casos. |
| RF-CD-02 | Deve existir bloco “Estado do caso” com origem (Painel/WhatsApp), contagem de mensagens, última atividade e situação do relatório (sem / em edição / finalizado). |
| RF-CD-03 | Caso ativo: conversa expandida por padrão. Caso encerrado: conversa recolhida por padrão. |
| RF-CD-04 | Remover botões de ação desabilitados falsos; exibir card com links para receitas, nova receita, atestados, novo atestado e ficha do paciente quando aplicável. |
| RF-CD-05 | Se `dashboard_chat_context_summary` existir e origem for painel, exibir trecho formatado (sem JSON bruto). |

## 7. Requisitos não funcionais

- Tokens semânticos; componentes Shadcn; PT-BR na UI.
- Sem chamadas Supabase novas em componentes cliente além do existente.

## 8. User stories (resumo)

- **US1:** Como pediatra, quero ver de relance canal e situação do relatório para priorizar o que fazer no caso.
- **US2:** Como pediatra, quero a conversa aberta em caso ativo para ler o fio sem clique extra.
- **US3:** Como pediatra, quero links reais para documentos em vez de botões “em breve”.

## 9. Riscos

- **Baixo:** ajuste de layout quebrar CSS do `CaseReport` — testar visualmente.
- **Baixo:** `formatDashboardChatContextSummaryForDisplay` retornar vazio — ocultar bloco.

## 10. Brief UX (integrado)

1. `gap-6` na página.  
2. Cabeçalho → `Separator`.  
3. Card estado (compacto, grid).  
4. Card paciente (título com nome).  
5. Card conversa.  
6. Relatório (inalterado funcionalmente).  
7. Card “Documentos e cadastros”.

---

## Referência

- Plano: `.cursor/plans/case_detail_refactor_ux_*.plan.md`

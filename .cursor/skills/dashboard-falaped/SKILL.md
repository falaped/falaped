---
name: dashboard-falaped
description: Arquitetura e estrutura do dashboard FALAPED (Next.js, modules, app routes, lib). Use ao criar ou alterar páginas, módulos, rotas ou ao falar da estrutura do projeto falaped dashboard.
---

# Dashboard FALAPED – Arquitetura

## Quando usar

Ao criar ou alterar páginas, módulos, rotas, lib; ou quando a tarefa mencionar estrutura do projeto, dashboard, pacientes, casos, perfil.

## Estrutura

```
app/
  (auth)/login, callback/     # Auth público
  dashboard/                 # Área restrita
    cases/                   # Lista de casos
      [id]/                  # Detalhe do caso (page, not-found)
      new/                   # Redirect para seleção de paciente
      select-patient/        # Entrada do fluxo Novo Caso
      new/[caseId]/          # Workspace de prontuário assistido
    patients/, profile/
lib/
  supabase/ client, server, middleware
  formatters.ts, parsers.ts, errors.ts
  format-clinical-assistant-sections.ts  # strip UI-mimic lines; constant legacy "Dados anotados" para merge no workspace
  strip-imc-calculation-template-prefix.ts # remove eco do template de IMC no início da reply (turno sem pedido de IMC)
  parse-anthropometrics-for-bmi.ts      # Peso/comprimento em texto livre; IMC com faixa plausível
modules/
  supabase/get-authenticated-user.ts   # getAuthenticatedUser – profile + authenticatedUser
  dashboard-assistant/
    planning/                          # Action planning layer (plan → queue → dispatch)
      turn-action-types.ts             # TurnAction / TurnActionPlan types, order + confirmation tables
      extract-actions-by-llm.ts        # LLM call (Groq) that extracts ordered actions from user message
      plan-assistant-turn-actions.ts   # Main planner: LLM actions + anthropometric/alert rules → ordered TurnActionPlan
    orchestrator/process-turn.ts       # Executes pipeline: detect plan, build queue, dispatch handlers, pause on confirmation
    intent/detect-intent-and-plan.ts   # Thin adapter: delegates to planner, maps TurnAction[] → PipelineStep[] / DetectedTurnPlan
    router/dispatch.ts                 # Route orchestrator (dispatch por intent/step)
    handlers/                          # Handlers por intent (business/ai separados), mantendo contrato RouteResult
    pipeline/assistant-turn-queue.ts   # Parse/build/advance da fila sequencial em JSONB
    pipeline/pipeline-policy.ts        # Ordem canônica dos passos + regras de confirmação (execution layer)
    route-case-assistant-turn.ts       # Motor legado reutilizado por handlers enquanto a migração incremental é concluída
    assistant-model-message.ts        # JSON do assistente → texto para contexto do modelo
  patients/, cases/, case-messages/,
  authenticated-users/, report-templates/
components/
  ui/                        # Shadcn primitives
  dashboard/                 # Feature components:
                             #   Cases list: CaseCard, CaseList, CaseEmptyState, CaseSearchInput,
                             #     CasesToolbarAndList (single list: active first, then closed by started_at),
                             #     CasesContent, CasesLoading
                             #   Case detail: CaseDetailHeader, CasePatientInfo,
                             #     CaseChat, CaseQuickActions, CaseReport,
                             #     CaseDetailContent, CaseDetailLoading
                             #   New case: SelectPatientWorkspace, NewCaseWorkspace
```

## Padrão de separação de código em páginas

Pages (`app/.../page.tsx`) são shells finos que importam:
- `{Feature}Content` — server component com data fetching (em `components/dashboard/`)
- `{Feature}Loading` — skeleton de loading (em `components/dashboard/`)
- A page envolve Content com `<Suspense fallback={<Loading />}>`

## Convenções

- **Módulos**: `modules/{domain}/`, um arquivo por query/action (kebab-case). Client Supabase sempre primeiro argumento.
- **Rotas**: `dashboard/cases`, `dashboard/cases/select-patient`, `dashboard/cases/new/[caseId]`, `dashboard/patients`, `dashboard/profile`. Proteção via middleware.
- **user_phone**: chave para filtrar dados do médico; obter via `getAuthenticatedUser(supabase)` e `result.authenticatedUser` (status paid, phone).

## Referências

- [docs/estrutura-do-projeto.md](../../docs/estrutura-do-projeto.md)
- [docs/plano-fases.md](../../docs/plano-fases.md)
- Rules: code-placement, supabase-queries

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
  falaped-assistant/                   # Módulo principal do assistente clínico
    contracts/                         # Tipos canônicos: AssistantIntent, AssistantTurnContext, RouteResult, turn-queue
    lib/                               # Funções puras testáveis:
      normalize-text.ts                #   normalizeText, normalizeForNearDuplicate
      message-classification.ts        #   is*Message classifiers (command, greeting, cancel, confirm, etc.)
      intent-detection.ts              #   detectAssistantIntent (heuristic)
      patient-profile-parsers.ts       #   parseBloodType, detectPatientProfileUpdate, etc.
      formatters.ts                    #   formatAgeFromBirthDate, buildPatientDataAccessReply, etc.
      stored-data-extraction.ts        #   extractStoredData, buildBmiStoredData
      thread-scanning.ts              #   buildMessagesForModel, getLatestPendingBmi, resolveClinicalSyncMode
      reply-variation.ts              #   areNearDuplicateReplies, enforceReplyVariation
      build-command-message.ts         #   buildCommandMessage
    clinical-alert-from-user-message.ts # Detect guardian alert signals from messages
    assistant-model-message.ts         # JSON do assistente → texto para contexto do modelo
    planning/                          # Action planning layer (plan → queue → dispatch)
      turn-action-types.ts             #   TurnAction / TurnActionPlan types
      llm-action-parsers.ts            #   Pure parsers for LLM output (cleanupRawContent, parseActionsFromPayload)
      extract-actions-by-llm.ts        #   LLM call (Groq) that extracts ordered actions
      planning-helpers.ts              #   Pure helpers (hasAnthropometricDivergence, shouldInjectGuardianAlertReview)
      plan-assistant-turn-actions.ts   #   Main planner: LLM + anthropometric/alert rules → TurnActionPlan
    pipeline/
      pipeline-policy.ts               #   ORDER_PRIORITY, CONFIRMATION_REQUIRED, orderPipelineSteps
      assistant-turn-queue.ts          #   Parse/build/advance da fila sequencial em JSONB
    intent/detect-intent-and-plan.ts   # Thin adapter: planner → PipelineStep[] / DetectedTurnPlan
    handlers/                          # 12 handlers por intent, contrato AssistantIntentHandler → RouteResult
    router/dispatch.ts                 # Dispatch por intent (HANDLERS record)
    orchestrator/process-turn.ts       # processAssistantTurn: detect → queue → dispatch → pause/advance
  dashboard-assistant/                 # LEGADO — mantido para referência; sem consumidores externos
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

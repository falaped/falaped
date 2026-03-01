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
    patients/, profile/
lib/
  supabase/ client, server, middleware
  formatters.ts, parsers.ts, errors.ts
modules/
  supabase/get-authenticated-user.ts   # getAuthenticatedUser – profile + authenticatedUser
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
```

## Padrão de separação de código em páginas

Pages (`app/.../page.tsx`) são shells finos que importam:
- `{Feature}Content` — server component com data fetching (em `components/dashboard/`)
- `{Feature}Loading` — skeleton de loading (em `components/dashboard/`)
- A page envolve Content com `<Suspense fallback={<Loading />}>`

## Convenções

- **Módulos**: `modules/{domain}/`, um arquivo por query/action (kebab-case). Client Supabase sempre primeiro argumento.
- **Rotas**: `dashboard/cases`, `dashboard/patients`, `dashboard/profile`. Proteção via middleware.
- **user_phone**: chave para filtrar dados do médico; obter via `getAuthenticatedUser(supabase)` e `result.authenticatedUser` (status paid, phone).

## Referências

- [docs/estrutura-do-projeto.md](../../docs/estrutura-do-projeto.md)
- [docs/plano-fases.md](../../docs/plano-fases.md)
- Rules: code-placement, supabase-queries

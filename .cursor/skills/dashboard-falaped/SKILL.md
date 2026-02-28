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
  get-authenticated-user-phone.ts   # Resolve user_phone do médico autenticado
  formatters.ts, parsers.ts, errors.ts
modules/
  patients/, cases/, case-messages/,
  authenticated-users/, report-templates/
components/
  ui/                        # Shadcn primitives
  dashboard/                 # Feature components:
                             #   Cases list: CaseCard, CaseList, CaseStatusFilter,
                             #     CaseEmptyState, CaseSearchInput, CasesToolbarAndList,
                             #     CasesContent, CasesLoading
                             #   Case detail: CaseDetailHeader, CasePatientInfo,
                             #     CaseChat, CaseQuickActions, CaseSummary,
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
- **user_phone**: chave para filtrar dados do médico; resolver via `getAuthenticatedUserPhone(supabase)`.

## Referências

- [docs/estrutura-do-projeto.md](../../docs/estrutura-do-projeto.md)
- [docs/plano-fases.md](../../docs/plano-fases.md)
- Rules: code-placement, supabase-queries

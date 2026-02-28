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
    cases/, patients/, profile/
lib/
  supabase/ client, server, middleware
  get-user-phone.ts
  formatters.ts, parsers.ts, errors.ts
modules/
  patients/, cases/, case-messages/,
  authenticated-users/, report-templates/
components/
  ui/                        # Shadcn primitives
  dashboard/                 # Feature components
```

## Convenções

- **Módulos**: `modules/{domain}/`, um arquivo por query/action (kebab-case). Client Supabase sempre primeiro argumento.
- **Rotas**: `dashboard/cases`, `dashboard/patients`, `dashboard/profile`. Proteção via middleware.
- **user_phone**: chave para filtrar dados do médico; resolver via `getUserPhone(supabase)`.

## Referências

- [docs/estrutura-do-projeto.md](../../docs/estrutura-do-projeto.md)
- [docs/plano-fases.md](../../docs/plano-fases.md)
- Rules: code-placement, supabase-queries

---
name: dependency-stack
description: Dependências principais do dashboard FALAPED (Next, Supabase, react-query, Zod, Tailwind). Use ao adicionar ou trocar pacotes, ou ao falar de stack e libs do projeto.
---

# Dependency Stack – Dashboard FALAPED

## Quando usar

Ao adicionar ou trocar pacotes; ou quando a tarefa mencionar stack, dependências, libs.

## Core

- **next** – Framework, App Router
- **@supabase/supabase-js**, **@supabase/ssr** – Supabase client e SSR

## Data e Forms

- **@tanstack/react-query** – Server state (patients, cases)
- **zod** – Validação
- **react-hook-form**, **@hookform/resolvers** – Forms

## UI

- **tailwindcss** – Estilos
- **class-variance-authority**, **clsx**, **tailwind-merge** – Componentes
- **lucide-react** – Ícones
- **@radix-ui/\*** – Via Shadcn

## Evitar

- Redux/MobX para server state
- styled-components/emotion
- Libs de form alternativas
- Fetch duplicado (usar modules/ + react-query)

## Referências

- [docs/dependencias.md](../../docs/dependencias.md)
- [docs/shadcn-componentes.md](../../docs/shadcn-componentes.md)

---
name: supabase-falaped
description: Define onde e como criar queries Supabase no dashboard FALAPED (uma query por arquivo em modules/{domain}, client como primeiro argumento). Use ao criar ou alterar queries, adicionar tabelas, migrations ou ao falar de Supabase, authenticated_users, cases, case_messages, patients neste projeto.
---

# Supabase no Dashboard FALAPED

## Quando usar

Ao criar ou alterar query, nova tabela ou migration; ou quando a tarefa mencionar Supabase, authenticated_users, cases, case_messages, patients, queries do banco.

## Onde fica tudo

- **Queries:** `modules/{domain}/`, um arquivo por query (kebab-case), função em camelCase.
  - Ex.: `modules/patients/get-patients-by-user-phone.ts` → `getPatientsByUserPhone`
  - **Auth:** `modules/supabase/sign-up-with-email.ts`, `sign-out.ts`, `get-authenticated-user.ts`
  - Domínios: `supabase` (auth), `profiles`, `authenticated-users`, `phone-link-codes` (create-link-code), `patients`, `cases`, `case-messages`, `report-templates`
- **Regra:** nunca chamar Supabase (`supabase.from()`, `supabase.auth.*`) diretamente em componentes; sempre usar módulos.
- **Tipos:** no próprio módulo (`types.ts`) ou `lib/types/`. Colunas no DB em snake_case.
- **Client:** `createServerClient` / `createBrowserClient` em `lib/supabase/`. Nunca criar o client dentro da query; quem chama injeta.
- **Storage:** bucket `report-pdfs` para PDFs; ver skill storage-pdfs.

## Assinatura das funções

Sempre `(supabase: SupabaseClient, ...args)`. Ex.: `getAuthenticatedUser(supabase, phone)`, `createPatient(supabase, userPhone, data)`.

## Padrão de query

- **Select explícito:** `.select('id, phone, status')` em vez de `*`.
- **Um registro:** `.maybeSingle()` (0 ou 1) ou `.single()` (exatamente 1).
- **Erro:** sempre checar `error`; em falha `throw new Error(...)`.
- **Insert/update:** `.insert(...).select('...').single()` para retornar o registro sem round-trip extra.
- **Evitar N+1:** `.select('*, relation(*)')` ou batch `.insert([...])`.

## Referências

- [docs/estrutura-do-projeto.md](../../docs/estrutura-do-projeto.md)
- [docs/schema-supabase.md](../../docs/schema-supabase.md)
- Rule: supabase-queries
- [schema.md](schema.md)

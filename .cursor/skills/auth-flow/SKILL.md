---
name: auth-flow
description: Fluxo de autenticação Supabase Auth (auth.users → profiles → authenticated_users, user_phone, middleware). Use ao implementar login, proteger rotas, resolver user_phone ou ao falar de autenticação no dashboard.
---

# Auth Flow – Dashboard FALAPED

## Quando usar

Ao implementar ou alterar login, middleware, proteção de rotas, resolução de `user_phone`.

## Fluxo

```
auth.users ← (auth_user_id) → profiles ← (profile_id) → authenticated_users
                                                              └── phone (user_phone)
```

1. No signup, um registro em `public.profiles` e um em `public.authenticated_users` são criados por trigger (`handle_new_auth_user()`): profiles com first_name, surname, email, phone; authenticated_users com profile_id, phone, status = 'unpaid'. Só quando phone está presente.
2. Usuário autentica via Supabase Auth (email ou phone).
3. Dashboard obtém `auth.user.id` da sessão.
4. Resolve `user_phone` via `auth.user.id` → `getProfileByAuthUserId` → `getAuthenticatedUserByProfileId` → retorna phone se status = 'paid'.
5. Queries usam `user_phone` para filtrar patients, cases, etc. Dados do médico (nome, email, etc.) vêm de `profiles`.

## Arquivos

- `lib/supabase/client.ts` (browser) e `server.ts` (server).
- `lib/supabase/middleware.ts` ou função no `middleware.ts` para refresh.
- `lib/get-authenticated-user-phone.ts` → `getAuthenticatedUserPhone(supabase)` para resolver `user_phone`.
- `modules/profiles/get-profile-by-auth-user-id.ts` → `getProfileByAuthUserId(supabase, authUserId)`.
- `modules/authenticated-users/get-authenticated-user-by-profile-id.ts` → `getAuthenticatedUserByProfileId(supabase, profileId)`.

## Rotas

- `/login`, `/callback` → públicas; se autenticado → redirect `/dashboard`.
- `/`, `/dashboard/*` → protegidas; se não autenticado → redirect `/login`.

## Referências

- Rule: supabase-auth
- [docs/sobre-o-projeto.md](../../docs/sobre-o-projeto.md) (fluxo)

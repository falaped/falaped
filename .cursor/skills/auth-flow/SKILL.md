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

1. Usuário autentica via Supabase Auth (email ou phone).
2. Dashboard obtém `auth.user.id` da sessão.
3. Resolve `user_phone` via `profiles` → `authenticated_users`.
4. Queries usam `user_phone` para filtrar patients, cases, etc.

## Arquivos

- `lib/supabase/client.ts` (browser) e `server.ts` (server).
- `lib/supabase/middleware.ts` ou função no `middleware.ts` para refresh.
- `lib/get-authenticated-user-phone.ts` → `getAuthenticatedUserPhone(supabase)` para resolver `user_phone`.

## Rotas

- `/login`, `/callback` → públicas; se autenticado → redirect `/dashboard`.
- `/`, `/dashboard/*` → protegidas; se não autenticado → redirect `/login`.

## Referências

- Rule: supabase-auth
- [docs/sobre-o-projeto.md](../../docs/sobre-o-projeto.md) (fluxo)

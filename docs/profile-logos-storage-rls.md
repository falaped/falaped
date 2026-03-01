# Storage profile-logos: bucket público e RLS

## Requisito

A URL salva no perfil (`profiles.logo_url_full`, `profiles.logo_url_short`) deve ser **pública**: qualquer pessoa com o link pode acessar a imagem (dashboard, relatórios, etc.), sem autenticação.

## Como garantir

1. **Bucket público** – O bucket `profile-logos` deve ser criado com `public = true`. Assim, a URL retornada por `getPublicUrl(path)` funciona sem login.
2. **RLS no Storage** – Quem pode **subir, atualizar ou apagar** arquivos continua restrito pelas políticas em `storage.objects` (apenas o dono do perfil). Leitura pública do objeto é permitida pelo bucket público; as políticas de SELECT em RLS não impedem o acesso via URL pública.

## Migration sugerida

Arquivo: `supabase/migrations/20260228200000_storage_profile_logos_public_and_rls.sql`

1. **Criar o bucket como público** (ou garantir que fique público se já existir):

```sql
insert into storage.buckets (id, name, public)
values ('profile-logos', 'profile-logos', true)
on conflict (id) do update set public = true;
```

2. **Políticas RLS em `storage.objects`** – Apenas o dono do perfil (path = `profile_id/...`) pode INSERT/UPDATE/DELETE; SELECT pode usar a mesma condição para consistência (o acesso público vem do bucket público):

```sql
create policy "Profile logos select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-logos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Profile logos insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-logos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Profile logos update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-logos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Profile logos delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-logos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
```

## Resumo

| Item | Ação |
|------|------|
| URL no profile | Pública: bucket `profile-logos` com `public = true`. |
| Quem pode subir/alterar/apagar | Só o usuário dono do perfil (RLS por path = profile_id). |
| Código app | Sem mudança; continua usando `getPublicUrl(path)` e salvando a URL no profile. |

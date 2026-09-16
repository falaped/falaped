-- books.falaped.com.br — pivô para MVP interno (issue #23).
-- Dono do livro é um usuário do Falaped (profile_id obrigatório); sem comprador,
-- pagamento, token público ou expiração. Tabelas ainda vazias em produção.

alter table public.books
  drop column email,
  drop column access_token,
  drop column appearance,
  drop column photo_path,
  drop column payment_ref,
  drop column paid_at,
  drop column expires_at,
  -- 1 a 2 fotos de referência em book-assets/{book_id}/photos/.
  add column photo_paths text[] not null default '{}',
  -- Qualidade do gpt-image-2 escolhida por livro.
  add column quality text not null default 'high' check (quality in ('medium', 'high')),
  -- Texto livre da página 1 (dedicatória) e marca do pediatra na página 19 (final).
  add column dedication text,
  add column pediatrician_name text,
  add column pediatrician_logo_path text;

alter table public.books
  alter column profile_id set not null,
  drop constraint books_profile_id_fkey,
  add constraint books_profile_id_fkey
    foreign key (profile_id) references public.profiles (id) on delete cascade;

-- draft → cover_ready (capa aprovada pelo usuário) → generating → ready | failed
alter table public.books
  drop constraint books_status_check,
  add constraint books_status_check
    check (status in ('draft', 'cover_ready', 'generating', 'ready', 'failed'));

drop index if exists public.books_expires_at_idx;
drop index if exists public.books_email_created_at_idx;

-- 0 = capa, 1 = dedicatória, 2..18 = história (17), 19 = final.
alter table public.book_pages
  drop constraint book_pages_index_check,
  add constraint book_pages_index_check check (index between 0 and 19),
  -- Prompt enviado ao modelo, para auditoria e para refazer a página.
  add column prompt text,
  add column updated_at timestamptz not null default now();

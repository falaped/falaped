-- book.falaped.com.br — livros infantis ilustrados (Fase 1, issue #10).
-- Comprador é anônimo (sem sessão): TODO acesso a estas tabelas e ao bucket
-- passa pelo service role no servidor, identificado por books.access_token.
-- RLS ligada sem policies = anon/authenticated não leem nem escrevem nada.

create table public.books (
  id uuid primary key default gen_random_uuid(),
  -- Token do link de acesso (e-mail / URL). uuid v4 = 122 bits aleatórios.
  access_token uuid not null unique default gen_random_uuid(),
  email text not null,
  -- Pediatra logado que gerou o livro (marca na dedicatória). Null no avulso.
  profile_id uuid references public.profiles (id) on delete set null,
  child_name text not null check (char_length(child_name) between 1 and 60),
  child_gender text not null check (child_gender in ('menino', 'menina')),
  theme text not null,
  -- Aparência escolhida quando não há foto (tom de pele, cabelo...). Null com foto.
  appearance jsonb,
  -- Path no bucket book-assets. Apagado após gerar o livro final.
  photo_path text,
  status text not null default 'draft'
    check (status in ('draft', 'preview_ready', 'paid', 'generating', 'ready', 'failed')),
  -- Referência no gateway de pagamento (Stripe session / Asaas payment).
  payment_ref text unique,
  paid_at timestamptz,
  pdf_path text,
  -- Após esta data o cron apaga PDF e imagens.
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index books_profile_id_idx on public.books (profile_id);
create index books_expires_at_idx on public.books (expires_at) where expires_at is not null;
-- Limite de previews por e-mail em 24h.
create index books_email_created_at_idx on public.books (email, created_at desc);

alter table public.books enable row level security;

create table public.book_pages (
  book_id uuid not null references public.books (id) on delete cascade,
  -- 0 = capa, 1 = dedicatória, 2..17 = história, 18 = final.
  index smallint not null check (index between 0 and 18),
  image_path text,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  primary key (book_id, index)
);

alter table public.book_pages enable row level security;

-- Bucket privado. Sem policies em storage.objects: só service role acessa.
insert into storage.buckets (id, name, public)
values ('book-assets', 'book-assets', false)
on conflict (id) do update set public = false;

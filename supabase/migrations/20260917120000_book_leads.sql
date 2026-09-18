-- books.falaped.com.br — landing pública com capa grátis (lead).
-- Visitante deixa nome, e-mail e WhatsApp, gera UMA capa (quality medium) e segue
-- para o pagamento pelo WhatsApp. Sem sessão: todo acesso passa pelo service role,
-- identificado pelo cookie com book_leads.id (uuid v4 aleatório). RLS sem policies.

create table public.book_leads (
  id uuid primary key default gen_random_uuid(),
  -- Sempre em minúsculas (normalizado na aplicação); um lead por e-mail.
  email text not null unique check (char_length(email) between 5 and 254),
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  -- Só dígitos, com DDD (10 ou 11).
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,11}$'),
  -- LGPD: quando aceitou a política de privacidade.
  consent_at timestamptz not null default now(),
  ip text,
  -- new → cover_ready (capa gerada) → checkout (pediu o livro) → paid (marcado à mão)
  status text not null default 'new' check (status in ('new', 'cover_ready', 'checkout', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Limite de leads por IP em 24h (anti-abuso do custo da capa).
create index book_leads_ip_created_at_idx on public.book_leads (ip, created_at desc) where ip is not null;

alter table public.book_leads enable row level security;

-- Livro de lead não tem dono no Falaped até o gestor "reivindicar" (setar profile_id):
-- aí ele aparece na lista do gestor em books.falaped.com.br para gerar as páginas e o PDF.
alter table public.books
  alter column profile_id drop not null,
  add column lead_id uuid unique references public.book_leads (id) on delete set null,
  add constraint books_owner_check check (profile_id is not null or lead_id is not null);

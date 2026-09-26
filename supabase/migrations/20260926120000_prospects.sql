-- Prospecção outbound: pediatras de MG captados na Doctoralia e no Google Maps
-- (antes numa página HTML solta com localStorage). Só o painel admin lê e escreve,
-- pelo service role — sem policy, ninguém autenticado enxerga a tabela.
create table public.prospects (
  id text primary key,
  kind text not null default 'médico' check (kind in ('médico', 'clínica')),
  title text,
  name text not null,
  full_name text not null,
  city text,
  email text,
  site_emails text[] not null default '{}',
  phone text,
  has_whatsapp boolean not null default false,
  crm text,
  rqe text,
  clinic text,
  address text,
  website text,
  profile_url text,
  map_url text,
  sources text[] not null default '{}',
  price text,
  rating text,
  reviews text,
  status text not null default 'novo'
    check (status in ('novo', 'contatado', 'respondeu', 'fechou', 'descartado')),
  notes text not null default '',
  invited_at timestamptz,
  invite_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospects enable row level security;
revoke all on public.prospects from anon, authenticated;

comment on table public.prospects is
  'Leads outbound (pediatras) para convite por e-mail. Leitura e escrita apenas via service role (painel admin).';

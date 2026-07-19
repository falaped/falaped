-- Biblioteca de orientações por marco de puericultura (DOC-06).
-- Modelo per-profile: cada médico mantém seus próprios textos editáveis, chaveados
-- por marco (D-05). Marco é um CAMPO (milestone), não uma tabela por marco (RESEARCH OQ2).
-- Rule: always enable RLS and create all policies in the same migration file.
-- Ownership anchor: profiles.auth_user_id = auth.uid().

create table public.guidance_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  milestone text not null,
  body text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_guidance_templates_profile_id on public.guidance_templates (profile_id);

comment on table public.guidance_templates is
  'Biblioteca de orientações por marco de puericultura, por profile. milestone: label do marco (1ª consulta, 1m, ...); body: texto editável da orientação; sort_order: ordem de exibição.';

create or replace function public.set_updated_at_guidance_templates()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_guidance_templates_set_updated_at
  before update on public.guidance_templates
  for each row
  execute function public.set_updated_at_guidance_templates();

alter table public.guidance_templates enable row level security;

create policy "Guidance templates select own"
on public.guidance_templates for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Guidance templates insert own"
on public.guidance_templates for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Guidance templates update own"
on public.guidance_templates for update to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
)
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Guidance templates delete own"
on public.guidance_templates for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

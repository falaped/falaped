-- Relational reference table: exam catalog items (catálogo de exames) per profile (D-01).
-- Per-profile reference data (RESEARCH Open Question 1 — default per-profile), scoped by profile_id.
create table public.exam_catalog_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_exam_catalog_items_profile_id on public.exam_catalog_items (profile_id);

comment on table public.exam_catalog_items is 'Catálogo de exames pesquisável por perfil (D-01). Referência per-médico, escopada por profile_id.';

create or replace function public.set_updated_at_exam_catalog_items()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_exam_catalog_items_set_updated_at
  before update on public.exam_catalog_items
  for each row
  execute function public.set_updated_at_exam_catalog_items();

alter table public.exam_catalog_items enable row level security;

create policy "Exam catalog items select own"
on public.exam_catalog_items for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Exam catalog items insert own"
on public.exam_catalog_items for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Exam catalog items update own"
on public.exam_catalog_items for update to authenticated
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

create policy "Exam catalog items delete own"
on public.exam_catalog_items for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

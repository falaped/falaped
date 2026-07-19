-- Relational reference table: reusable exam panels (painéis de exames) per profile (D-02).
-- panel_items stores RESOLVED exam name strings that expand into the editable wizard array (D-03).
create table public.exam_panels (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  panel_items text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_exam_panels_profile_id on public.exam_panels (profile_id);

comment on table public.exam_panels is 'Painéis reutilizáveis de exames por perfil (D-02). panel_items: array de strings de exames que expandem em itens editáveis no wizard (D-03). Escopado por profile_id.';

create or replace function public.set_updated_at_exam_panels()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_exam_panels_set_updated_at
  before update on public.exam_panels
  for each row
  execute function public.set_updated_at_exam_panels();

alter table public.exam_panels enable row level security;

create policy "Exam panels select own"
on public.exam_panels for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Exam panels insert own"
on public.exam_panels for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Exam panels update own"
on public.exam_panels for update to authenticated
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

create policy "Exam panels delete own"
on public.exam_panels for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

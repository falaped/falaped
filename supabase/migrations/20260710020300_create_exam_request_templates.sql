create table public.exam_request_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_exam_request_templates_profile_id on public.exam_request_templates (profile_id);

comment on table public.exam_request_templates is 'Templates de pedido de exames salvos pelo médico. snapshot: exams (array de strings resolvidas), hypothesis, observations.';

create or replace function public.set_updated_at_exam_request_templates()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_exam_request_templates_set_updated_at
  before update on public.exam_request_templates
  for each row
  execute function public.set_updated_at_exam_request_templates();

alter table public.exam_request_templates enable row level security;

create policy "Exam request templates select own"
on public.exam_request_templates for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Exam request templates insert own"
on public.exam_request_templates for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Exam request templates update own"
on public.exam_request_templates for update to authenticated
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

create policy "Exam request templates delete own"
on public.exam_request_templates for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

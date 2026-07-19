create table public.medical_report_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_medical_report_templates_profile_id on public.medical_report_templates (profile_id);

comment on table public.medical_report_templates is 'Templates de relatório médico salvos pelo médico. snapshot: title, bodyHtml.';

create or replace function public.set_updated_at_medical_report_templates()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_medical_report_templates_set_updated_at
  before update on public.medical_report_templates
  for each row
  execute function public.set_updated_at_medical_report_templates();

alter table public.medical_report_templates enable row level security;

create policy "Medical report templates select own"
on public.medical_report_templates for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical report templates insert own"
on public.medical_report_templates for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical report templates update own"
on public.medical_report_templates for update to authenticated
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

create policy "Medical report templates delete own"
on public.medical_report_templates for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

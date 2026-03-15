create table public.prescription_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_prescription_templates_profile_id on public.prescription_templates (profile_id);

comment on table public.prescription_templates is 'Templates de receita salvos pelo médico. snapshot: medications, orientations, warning_signs, additional_notes, location_state.';

create or replace function public.set_updated_at_prescription_templates()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_prescription_templates_set_updated_at
  before update on public.prescription_templates
  for each row
  execute function public.set_updated_at_prescription_templates();

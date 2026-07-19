create table public.referral_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_referral_templates_profile_id on public.referral_templates (profile_id);

comment on table public.referral_templates is 'Templates de encaminhamento salvos pelo médico. snapshot: specialty, reason, clinicalSummary, urgency.';

create or replace function public.set_updated_at_referral_templates()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_referral_templates_set_updated_at
  before update on public.referral_templates
  for each row
  execute function public.set_updated_at_referral_templates();

alter table public.referral_templates enable row level security;

create policy "Referral templates select own"
on public.referral_templates for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Referral templates insert own"
on public.referral_templates for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Referral templates update own"
on public.referral_templates for update to authenticated
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

create policy "Referral templates delete own"
on public.referral_templates for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- Run this in Supabase Dashboard → SQL Editor if you cannot use "supabase db push".
-- 1) Table prescriptions
create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid null references public.patients(id) on delete set null,
  case_id uuid null references public.cases(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  location_state text null,
  issued_at date not null,
  pdf_storage_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prescriptions_profile_id on public.prescriptions (profile_id);
create index if not exists idx_prescriptions_issued_at on public.prescriptions (issued_at desc);

comment on table public.prescriptions is
  'Receitas de medicamentos geradas pelo perfil. payload contém patientName, birthDate e medications (array); pdf_storage_path opcional para PDF no storage.';

create or replace function public.set_updated_at_prescriptions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_prescriptions_set_updated_at on public.prescriptions;
create trigger trg_prescriptions_set_updated_at
  before update on public.prescriptions
  for each row
  execute function public.set_updated_at_prescriptions();

-- 2) Storage bucket prescriptions
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict (id) do update set public = false;

create policy "Prescriptions select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

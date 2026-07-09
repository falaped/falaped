-- Anthropometric measurements per patient (GROWTH-01, D-08/D-10/D-11/D-14).
-- One row per measurement date; weight/length-height/head-circumference are each
-- optional but at least one must be present (CHECK, D-11). Age and percentile are
-- NEVER stored — derived at read time. Scoped by profile_id + patient_id (D-14).

create table public.patient_measurements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  measured_on date not null,
  weight_grams integer,
  length_height_mm integer,
  head_circumference_mm integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_measurements_at_least_one_measure_check check (
    weight_grams is not null
    or length_height_mm is not null
    or head_circumference_mm is not null
  )
);

comment on table public.patient_measurements is
  'Medições antropométricas por paciente (peso g / estatura mm / PC mm). Ao menos uma medida por linha (CHECK). Idade e percentil derivados em leitura — nunca armazenados. Escopo profile_id + patient_id.';

create index idx_patient_measurements_profile_patient_measured
  on public.patient_measurements (profile_id, patient_id, measured_on);

-- Keep updated_at in sync (per-table function, following the medical_certificates analog).
create or replace function public.set_updated_at_patient_measurements()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_patient_measurements_set_updated_at
  before update on public.patient_measurements
  for each row
  execute function public.set_updated_at_patient_measurements();

-- RLS: owner-scoped by profile_id only (growth has no WhatsApp-origin flow).
-- Rule: enable RLS and create all policies in the same migration file (D-14).

alter table public.patient_measurements enable row level security;

create policy "Patient measurements select own"
on public.patient_measurements for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient measurements insert own"
on public.patient_measurements for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient measurements update own"
on public.patient_measurements for update to authenticated
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

create policy "Patient measurements delete own"
on public.patient_measurements for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- Applied vaccine doses per patient (VAC-05, pulled forward from Phase 6).
-- One row per (patient, reference schedule item) that the physician has marked
-- as TAKEN. Boolean grain only: the row's presence = "tomada"; its absence =
-- "não tomada". No date/lote/local fields here (that stays Phase 6) — only an
-- automatic `taken_at` timestamp. Position-only for the reference display: this
-- table records applied doses but drives NO pending/late/next-due diff (D-11,
-- that is Phase 6).
--
-- GRAIN (physician decision): the mark is keyed to a SPECIFIC reference item
-- (`schedule_item_id`), so SUS and SBIm items are INDEPENDENT — marking the SUS
-- Pentavalente at 2m does NOT mark the SBIm one.
--
-- OWNED table (unlike the GLOBAL reference vaccine_schedules): this is per-patient
-- clinical data, so it carries full owner scoping (profile_id + patient_id) and
-- owner-scoped RLS, mirroring public.patient_measurements exactly (D-14).

create table public.patient_vaccine_doses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  schedule_item_id uuid not null references public.vaccine_schedule_items(id) on delete cascade,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint patient_vaccine_doses_unique_mark unique (profile_id, patient_id, schedule_item_id)
);

comment on table public.patient_vaccine_doses is
  'Doses vacinais aplicadas por paciente (VAC-05, antecipado da Fase 6). Presença da linha = tomada; ausência = não tomada. Grão booleano por item de referência específico (SUS e SBIm independentes). Somente posição — nenhum diff de pendência (Fase 6). Escopo profile_id + patient_id.';

create index idx_patient_vaccine_doses_profile_patient
  on public.patient_vaccine_doses (profile_id, patient_id);

-- RLS: owner-scoped by profile_id only (applied doses have no WhatsApp-origin flow).
-- Rule: enable RLS and create all policies in the same migration file (D-14),
-- mirroring patient_measurements.

alter table public.patient_vaccine_doses enable row level security;

create policy "Patient vaccine doses select own"
on public.patient_vaccine_doses for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient vaccine doses insert own"
on public.patient_vaccine_doses for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient vaccine doses update own"
on public.patient_vaccine_doses for update to authenticated
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

create policy "Patient vaccine doses delete own"
on public.patient_vaccine_doses for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

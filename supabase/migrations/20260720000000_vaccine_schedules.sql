-- Vaccine reference calendar tables (VAC-01/VAC-04, phase 05).
-- DELIBERATE DIVERGENCE from every other table in this repo (D-07): these are
-- GLOBAL, read-only reference data shared by all doctors. There is NO owner
-- (profile) column and NO owner scoping — do NOT "fix" this by adding an owner
-- filter as done in every other table.
-- Provenance is versioned per dataset via source/version/effective_date (D-08).
-- Seed-only tables (no app writes) — no updated_at/set_updated_at trigger by design.

create table public.vaccine_schedules (
  id uuid primary key default gen_random_uuid(),
  source text not null,                    -- 'SUS' | 'SBIm' | 'gestante'
  axis text not null default 'child_age',  -- 'child_age' | 'gestational_weeks' (D-04)
  version text not null,                   -- e.g. 'PNI 2025'
  effective_date date not null,            -- vigência por dataset (D-08/D-09)
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.vaccine_schedules is
  'Metadata versionada por calendário de vacina (SUS/SBIm/gestante). Vigência por dataset (D-08). Dado de referência GLOBAL, somente leitura — SEM coluna de dono, SEM escopo por perfil (D-07). Escrita apenas via migration/service-role.';

create table public.vaccine_schedule_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.vaccine_schedules(id) on delete cascade,
  vaccine text not null,
  dose text,
  age_months integer,        -- structured child_age axis (for Phase 6 per-age diff)
  age_months_max integer,    -- window upper bound; null = single point
  week_min integer,          -- structured gestational_weeks axis
  week_max integer,          -- null = "a partir de"
  age_label text not null,   -- human text the UI renders (D-05)
  sort_order integer not null default 0,
  notes text
);

comment on table public.vaccine_schedule_items is
  'Itens (vacina/dose/idade) de um calendário de vacina. Campo estruturado age_months/week_min para o diff por idade (Phase 6) + age_label humano para a UI (D-05). Referência GLOBAL, sem coluna de dono (D-07).';

create index idx_vaccine_schedule_items_schedule
  on public.vaccine_schedule_items (schedule_id, sort_order);

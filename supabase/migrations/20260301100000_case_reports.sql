-- Table for case reports: one report per case, generated from conversation via LLM.
-- id is used for report.pdf path in storage. profile_id allows listing reports by user.

create table public.case_reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  report_template_id uuid not null references public.report_templates(id) on delete restrict,
  sections jsonb not null default '[]'::jsonb,
  is_finalized boolean not null default false,
  finalized_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_reports_case_id_unique unique (case_id)
);

create index idx_case_reports_profile_id on public.case_reports (profile_id);
create index idx_case_reports_case_id on public.case_reports (case_id);

comment on table public.case_reports is
  'One report per case. id used for report.pdf path in storage; profile_id for listing reports by user. sections: array of { name, description?, content, order }.';

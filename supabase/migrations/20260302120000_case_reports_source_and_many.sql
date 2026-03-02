-- Allow N reports per case and add source (where the report was generated).
alter table public.case_reports
  drop constraint if exists case_reports_case_id_unique;

alter table public.case_reports
  add column if not exists source text not null default 'dashboard';

comment on column public.case_reports.source is
  'Origin of the report: dashboard (generated in app), api, etc.';

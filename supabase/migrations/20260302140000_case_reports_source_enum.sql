-- Source of the report: web (dashboard/app) or whatsapp.
create type public.case_report_source as enum ('web', 'whatsapp');

-- Drop existing check if present (e.g. case_reports_source_check).
alter table public.case_reports
  drop constraint if exists case_reports_source_check;

-- Drop default so we can change column type (text default cannot cast to enum).
alter table public.case_reports
  alter column source drop default;

-- Convert source column to enum. Map existing 'dashboard' or other values to 'web'.
alter table public.case_reports
  alter column source type public.case_report_source
  using (
    case
      when source in ('web', 'dashboard') or source is null then 'web'::public.case_report_source
      when source = 'whatsapp' then 'whatsapp'::public.case_report_source
      else 'web'::public.case_report_source
    end
  );

alter table public.case_reports
  alter column source set default 'web'::public.case_report_source;

comment on type public.case_report_source is
  'Origin of the case report: web (dashboard/app) or whatsapp.';

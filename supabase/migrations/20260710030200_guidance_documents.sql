-- Documento de orientação gerado (imprimível) por paciente (DOC-06 / D-06).
-- Clona o triple de 04-01 com slug guidance_documents.
create table public.guidance_documents (
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

create index idx_guidance_documents_profile_id on public.guidance_documents (profile_id);
create index idx_guidance_documents_issued_at on public.guidance_documents (issued_at desc);

comment on table public.guidance_documents is
  'Documentos de orientação gerados pelo perfil. payload contém patientName, birthDate, milestone (rótulo) e body (texto); pdf_storage_path opcional para PDF no storage.';

create or replace function public.set_updated_at_guidance_documents()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_guidance_documents_set_updated_at
  before update on public.guidance_documents
  for each row
  execute function public.set_updated_at_guidance_documents();

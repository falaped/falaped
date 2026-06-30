alter table public.patients
add column if not exists photo_path text,
add column if not exists consent_given boolean,
add column if not exists consent_at timestamptz;

comment on column public.patients.photo_path is
  'Path do objeto no bucket privado patient-photos (profile_id/patient_id.ext). NULL quando não há foto. Nunca uma URL (D-02).';

comment on column public.patients.consent_given is
  'Prova auditável mínima de consentimento do responsável para armazenar a foto da criança (D-05). NULL quando não há foto.';

comment on column public.patients.consent_at is
  'Data/hora em que o consentimento do responsável foi registrado (D-05). NULL quando não há foto.';

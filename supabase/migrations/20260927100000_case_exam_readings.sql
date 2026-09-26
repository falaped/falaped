-- Leitura de exames com IA dentro do atendimento: o médico envia fotos/PDF do
-- exame, o modelo de visão transcreve os valores, o médico confere e um segundo
-- modelo redige o rascunho do relatório.
--
-- `case_id` é `on delete set null` como em patient_scale_results: a leitura nasce
-- na consulta mas é registro clínico do PACIENTE, e apagar o caso não pode
-- apagar dado que o médico já conferiu.
--
-- `page_paths` aponta para o bucket privado patient-attachments (prefixo
-- {profile_id}/ é o escopo da RLS de storage já existente). `items` guarda o que o
-- médico CONFIRMOU (o extraído cru é sobrescrito na confirmação, de propósito:
-- o que vale é o conferido). `report_text` é o rascunho editável.
-- Regra D-14: RLS habilitada e todas as policies no MESMO arquivo de migration.

create table public.case_exam_readings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  title text not null,
  page_paths text[] not null default '{}',
  exam_info jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  report_text text,
  vision_model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.case_exam_readings is
  'Leitura de exame por IA (visão) dentro de um atendimento. page_paths no bucket privado patient-attachments; items = valores CONFIRMADOS pelo médico; report_text = rascunho do relatório. Escopo profile_id + patient_id.';

create index idx_case_exam_readings_case_created
  on public.case_exam_readings (case_id, created_at desc);

create index idx_case_exam_readings_profile_patient
  on public.case_exam_readings (profile_id, patient_id, created_at desc);

alter table public.case_exam_readings enable row level security;

create policy "Case exam readings select own"
on public.case_exam_readings for select to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "Case exam readings insert own"
on public.case_exam_readings for insert to authenticated
with check (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "Case exam readings update own"
on public.case_exam_readings for update to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
)
with check (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "Case exam readings delete own"
on public.case_exam_readings for delete to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

-- Anexos do paciente: exames, laudos externos, qualquer arquivo que o médico
-- queira guardar como referência (issue #40).
--
-- `case_id` é opcional e `on delete set null`: o anexo pode ser enviado dentro
-- de uma consulta, mas pertence ao PACIENTE e sobrevive à exclusão do caso.
--
-- Sem policy de UPDATE e sem updated_at: anexo não se edita — troca-se por outro.
-- Regra D-14: RLS habilitada e todas as policies no MESMO arquivo de migration.

create table public.patient_attachments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

comment on table public.patient_attachments is
  'Arquivos anexados ao paciente (exames, laudos externos). storage_path aponta para o bucket privado patient-attachments; a URL NUNCA é persistida (assina-se no acesso). Escopo profile_id + patient_id.';

create index idx_patient_attachments_profile_patient_created
  on public.patient_attachments (profile_id, patient_id, created_at desc);

create index idx_patient_attachments_case
  on public.patient_attachments (case_id);

alter table public.patient_attachments enable row level security;

create policy "Patient attachments select own"
on public.patient_attachments for select to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "Patient attachments insert own"
on public.patient_attachments for insert to authenticated
with check (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "Patient attachments delete own"
on public.patient_attachments for delete to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

-- Bucket PRIVADO. O prefixo {profile_id}/ no path É o escopo da RLS de storage.
insert into storage.buckets (id, name, public)
values ('patient-attachments', 'patient-attachments', false)
on conflict (id) do update set public = false;

create policy "Patient attachments storage select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'patient-attachments'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient attachments storage insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'patient-attachments'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient attachments storage delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'patient-attachments'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

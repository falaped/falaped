-- Resultado de escala pediátrica aplicada pelo médico (issue #43).
-- Uma linha por aplicação: a mesma escala pode ser aplicada várias vezes no mesmo
-- caso e no mesmo paciente (sem unicidade por caso, de propósito).
-- Escopo profile_id + patient_id, no padrão de patient_measurements (D-14).
--
-- `case_id` é opcional e `on delete set null`: a escala é aplicada dentro da
-- consulta, mas o registro pertence ao PACIENTE e tem que sobreviver à exclusão
-- do caso — é histórico clínico.
--
-- `answers` guarda a resposta crua (item -> valor escolhido) e `score`/
-- `interpretation` guardam o resultado JÁ CALCULADO. Não é redundância: a
-- definição da escala em lib/scales/ pode mudar (texto, faixa), e o que o médico
-- viu e registrou naquele dia não pode mudar junto.

create table public.patient_scale_results (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  scale_key text not null,
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  interpretation text not null,
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.patient_scale_results is
  'Aplicações de escalas pediátricas (FLACC, Wong-Baker, ...). Uma linha por aplicação; várias por caso são válidas. score/interpretation são congelados no momento da aplicação. Escopo profile_id + patient_id.';

create index idx_patient_scale_results_profile_patient_applied
  on public.patient_scale_results (profile_id, patient_id, applied_at desc);

create index idx_patient_scale_results_case
  on public.patient_scale_results (case_id);

-- RLS: escopo por dono (profile_id), como patient_measurements. Sem policy de
-- UPDATE: uma aplicação de escala é registro pontual — errou, apaga e aplica de
-- novo. Por isso também não há updated_at nem trigger.

alter table public.patient_scale_results enable row level security;

create policy "Patient scale results select own"
on public.patient_scale_results for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient scale results insert own"
on public.patient_scale_results for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient scale results delete own"
on public.patient_scale_results for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

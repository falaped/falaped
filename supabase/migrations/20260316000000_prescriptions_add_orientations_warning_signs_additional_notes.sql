alter table public.prescriptions
  add column if not exists orientations text null,
  add column if not exists warning_signs text null,
  add column if not exists additional_notes text null;

comment on column public.prescriptions.orientations is 'Orientações gerais da receita';
comment on column public.prescriptions.warning_signs is 'Sinais de alerta para o paciente/responsável';
comment on column public.prescriptions.additional_notes is 'Anotações adicionais do médico';

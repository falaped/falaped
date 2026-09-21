-- Pressão arterial na mesma linha da antropometria: a PA é aferida na mesma
-- hora do peso e da estatura, e a classificação AAP 2017 depende justamente da
-- estatura daquela medição. Tabela nova seria uma junção a mais para nada.
alter table public.patient_measurements
  add column if not exists systolic_bp integer,
  add column if not exists diastolic_bp integer;

comment on column public.patient_measurements.systolic_bp is 'Pressão arterial sistólica em mmHg, aferida na mesma consulta da antropometria.';
comment on column public.patient_measurements.diastolic_bp is 'Pressão arterial diastólica em mmHg.';

alter table public.patient_measurements
  drop constraint if exists patient_measurements_bp_range;

alter table public.patient_measurements
  add constraint patient_measurements_bp_range check (
    (systolic_bp is null or systolic_bp between 40 and 260)
    and (diastolic_bp is null or diastolic_bp between 20 and 200)
    and (systolic_bp is null or diastolic_bp is null or systolic_bp > diastolic_bp)
  );

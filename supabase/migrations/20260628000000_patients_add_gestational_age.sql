alter table public.patients
add column if not exists gestational_age_weeks integer;

comment on column public.patients.gestational_age_weeks is
  'Idade gestacional ao nascer em semanas (20–42). NULL quando desconhecida; usada para idade corrigida de prematuros.';

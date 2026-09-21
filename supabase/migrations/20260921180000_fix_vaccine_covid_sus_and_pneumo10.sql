-- Correções do calendário de vacinas da CRIANÇA apontadas pelo médico (21/09/2026).
-- Issue #41. Fonte da verdade clínica: o médico. O executor apenas transcreve.
--
-- 1) COVID-19 1ª dose (6 meses) estava no calendário PARTICULAR (SBIm). É vacina
--    do SUS/PNI — a 2ª e a 3ª dose já estavam no SUS (7 e 9 meses), só a 1ª ficou
--    no lugar errado.
-- 2) Pneumo 10 só existia como 2ª dose (4 meses). O médico pede a vacina também
--    nas faixas de 2 e 6 meses, por causa do esquema de transição VPC10 -> VPC20
--    do PNI (a nota da linha de 4 meses já descreve essa transição).
--
-- POR QUE UPDATE E NÃO DELETE + INSERT no item do COVID:
-- patient_vaccine_doses.schedule_item_id referencia vaccine_schedule_items com
-- ON DELETE CASCADE. O item do COVID no SBIm já tinha marcações de dose de
-- pacientes reais — apagá-lo apagaria o registro clínico do médico. Mover o item
-- de calendário (update do schedule_id) preserva as marcações, que passam a
-- aparecer no calendário do SUS, que é onde a dose de fato foi aplicada.

begin;

-- 1) Mover o item COVID-19 1ª dose do calendário particular (SBIm) para o SUS,
--    no fim da faixa de 6 meses (sort_order 55; a faixa SUS vai até 53 hoje).
update public.vaccine_schedule_items i
set schedule_id = (
      select s.id from public.vaccine_schedules s
      where s.source = 'SUS' and s.axis = 'child_age'
    ),
    sort_order = 55
from public.vaccine_schedules sb
where sb.id = i.schedule_id
  and sb.source = 'SBIm'
  and sb.axis = 'child_age'
  and i.vaccine = 'COVID-19'
  and i.dose = '1ª dose'
  and i.age_months = 6;

-- 2) Abrir espaço na faixa de 2 meses do SUS para o Pneumo 10 ficar ao lado do
--    Pneumo 20 (hoje: 12 = Pneumo 20, 13 = Rotavírus monovalente).
update public.vaccine_schedule_items i
set sort_order = 14
from public.vaccine_schedules s
where s.id = i.schedule_id
  and s.source = 'SUS'
  and s.axis = 'child_age'
  and i.vaccine = 'Rotavírus monovalente'
  and i.dose = '1ª dose'
  and i.age_months = 2;

-- 3) Pneumo 10 nas faixas de 2 e 6 meses do SUS. A nota repete a da 2ª dose, que
--    veio do PDF do médico.
insert into public.vaccine_schedule_items
  (schedule_id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)
select s.id, v.vaccine, v.dose, v.age_months, null, null, null, v.age_label, v.sort_order, v.notes
from (values
  ('Pneumo 10', '1ª dose', 2, '2 meses', 13, 'Em esquema de transição até finalizar as doses de Pneumo 10. VPC20 e VPC15 são intercambiáveis. O PNI recomenda esquema 2+1 com a VPC20 (transição: VPC20 aos 2 meses, VPC10 aos 4 meses e VPC20 aos 12 meses).'),
  ('Pneumo 10', '3ª dose', 6, '6 meses', 54, 'Em esquema de transição até finalizar as doses de Pneumo 10. VPC20 e VPC15 são intercambiáveis. O PNI recomenda esquema 2+1 com a VPC20 (transição: VPC20 aos 2 meses, VPC10 aos 4 meses e VPC20 aos 12 meses).')
) as v(vaccine, dose, age_months, age_label, sort_order, notes)
join public.vaccine_schedules s
  on s.source = 'SUS' and s.axis = 'child_age';

commit;

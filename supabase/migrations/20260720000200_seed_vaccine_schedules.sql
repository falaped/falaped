-- Seed dos calendários de vacina de referência (CONTEÚDO CLÍNICO APROVADO PELO MÉDICO
-- no checkpoint human-verify 05-01 — Pitfall 3 / D-04). O executor NÃO autora os valores clínicos.
-- O médico assumiu a responsabilidade de conferir a acurácia contra a fonte oficial atual
-- (Calendário Nacional de Vacinação da criança — PNI/SUS, Ministério da Saúde).
-- Idempotente (where not exists): re-executar não duplica linhas.
--
-- DIVERGÊNCIA DELIBERADA (D-07): dado de referência GLOBAL, somente leitura.
-- Insere UMA ÚNICA VEZ, GLOBALMENTE — sem tabela de donos, sem fan-out por dono,
-- sem coluna de dono. NÃO replicar o modelo por-dono dos seeds de exam_catalog / guidance_templates.
--
-- Escopo deste plano (05-01): metadata das 3 tabelas (SUS/SBIm/gestante) + ITENS apenas do SUS.
-- Os itens do SBIm entram no plano 02 e os da gestante no plano 03.

-- 1) Metadata dos 3 calendários (idempotente por source+version). GLOBAL, sem coluna de dono.
insert into public.vaccine_schedules (source, axis, version, effective_date, notes)
select v.source, v.axis, v.version, v.effective_date::date, v.notes
from (values
  ('SUS', 'child_age', 'PNI 2025', '2025-01-01', 'Calendário Nacional de Vacinação da criança (PNI/SUS), Ministério da Saúde.'),
  ('SBIm', 'child_age', 'SBIm 2025', '2025-01-01', null),
  ('gestante', 'gestational_weeks', 'SBIm 2025', '2025-01-01', null)
) as v(source, axis, version, effective_date, notes)
where not exists (
  select 1 from public.vaccine_schedules s
  where s.source = v.source and s.version = v.version
);

-- 2) Itens do calendário SUS/PNI da criança (aprovados pelo médico no checkpoint 05-01).
--    Estruturado age_months/age_months_max (para o diff por idade da Phase 6) + age_label humano (D-05).
--    week_min/week_max ficam null no eixo child_age. sort_order crescente por idade.
--    Inserido GLOBALMENTE (join no schedule por source/version), UMA VEZ, sem coluna de dono.
insert into public.vaccine_schedule_items
  (schedule_id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)
select s.id, v.vaccine, v.dose, v.age_months, v.age_months_max::integer, null, null, v.age_label, v.sort_order, v.notes
from (values
  -- Ao nascer
  ('BCG',                          'Dose única',   0,  null, 'Ao nascer',  0,  null),
  ('Hepatite B',                   'Ao nascer',    0,  null, 'Ao nascer',  1,  'Preferencialmente nas primeiras 12–24 horas de vida.'),
  -- 2 meses
  ('Pentavalente (DTP+Hib+HB)',    '1ª dose',      2,  null, '2 meses',    10, null),
  ('VIP (poliomielite inativada)', '1ª dose',      2,  null, '2 meses',    11, null),
  ('Pneumocócica 10-valente',      '1ª dose',      2,  null, '2 meses',    12, null),
  ('Rotavírus humano (VRH)',       '1ª dose',      2,  null, '2 meses',    13, 'Respeitar limite de idade para início do esquema.'),
  -- 3 meses
  ('Meningocócica C (conjugada)',  '1ª dose',      3,  null, '3 meses',    20, null),
  -- 4 meses
  ('Pentavalente (DTP+Hib+HB)',    '2ª dose',      4,  null, '4 meses',    30, null),
  ('VIP (poliomielite inativada)', '2ª dose',      4,  null, '4 meses',    31, null),
  ('Pneumocócica 10-valente',      '2ª dose',      4,  null, '4 meses',    32, null),
  ('Rotavírus humano (VRH)',       '2ª dose',      4,  null, '4 meses',    33, 'Respeitar limite de idade para a 2ª dose.'),
  -- 5 meses
  ('Meningocócica C (conjugada)',  '2ª dose',      5,  null, '5 meses',    40, null),
  -- 6 meses
  ('Pentavalente (DTP+Hib+HB)',    '3ª dose',      6,  null, '6 meses',    50, null),
  ('VIP (poliomielite inativada)', '3ª dose',      6,  null, '6 meses',    51, null),
  ('COVID-19',                     'Conforme campanha', 6, null, '6 meses', 52, 'Esquema conforme campanha vigente para a faixa etária.'),
  -- 9 meses
  ('Febre amarela',                'Dose inicial', 9,  null, '9 meses',    60, null),
  -- 12 meses
  ('Tríplice viral (SCR)',         '1ª dose',      12, null, '12 meses',   70, null),
  ('Pneumocócica 10-valente',      'Reforço',      12, null, '12 meses',   71, null),
  ('Meningocócica C (conjugada)',  'Reforço',      12, null, '12 meses',   72, null),
  -- 15 meses
  ('DTP (tríplice bacteriana)',    '1º reforço',   15, null, '15 meses',   80, null),
  ('VOP (poliomielite oral)',      '1º reforço',   15, null, '15 meses',   81, null),
  ('Hepatite A',                   'Dose única',   15, null, '15 meses',   82, null),
  ('Tetra viral (SCR + varicela)', 'Dose única',   15, null, '15 meses',   83, 'Corresponde à 2ª dose de tríplice viral + 1ª de varicela.'),
  -- 4 anos (48 meses)
  ('DTP (tríplice bacteriana)',    '2º reforço',   48, null, '4 anos',     90, null),
  ('VOP (poliomielite oral)',      '2º reforço',   48, null, '4 anos',     91, null),
  ('Febre amarela',                'Reforço',      48, null, '4 anos',     92, null),
  ('Varicela',                     '2ª dose',      48, null, '4 anos',     93, null)
) as v(vaccine, dose, age_months, age_months_max, age_label, sort_order, notes)
join public.vaccine_schedules s
  on s.source = 'SUS' and s.version = 'PNI 2025'
where not exists (
    select 1 from public.vaccine_schedule_items i
    where i.schedule_id = s.id
      and i.vaccine = v.vaccine
      and i.dose is not distinct from v.dose
      and i.age_label = v.age_label
  );

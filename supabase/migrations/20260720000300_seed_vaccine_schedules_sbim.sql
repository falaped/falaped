-- Seed dos ITENS do calendário particular/SBIm da criança (CONTEÚDO CLÍNICO
-- APROVADO PELO MÉDICO no checkpoint human-verify 05-02 — Pitfall 3 / D-04 / T-05-04).
-- O executor NÃO autora os valores clínicos: o médico revisou e aprovou ("approved")
-- as vacinas/doses/idades do calendário SBIm 2025 no checkpoint bloqueante do plano 05-02.
-- O médico assumiu a responsabilidade de conferir a acurácia contra a fonte oficial atual
-- (Calendário de vacinação da criança — Sociedade Brasileira de Imunizações / SBIm).
-- Idempotente (where not exists): re-executar não duplica linhas.
--
-- DIVERGÊNCIA DELIBERADA (D-07): dado de referência GLOBAL, somente leitura.
-- Insere UMA ÚNICA VEZ, GLOBALMENTE — sem tabela de donos, sem fan-out por dono,
-- sem coluna de dono. NÃO replicar o modelo por-dono dos seeds de exam_catalog / guidance_templates.
--
-- Escopo deste plano (05-02): apenas os ITENS do SBIm. A metadata do calendário SBIm
-- (source='SBIm', version='SBIm 2025') JÁ foi semeada no plano 05-01 — NÃO reinserir.
-- Os itens da gestante entram no plano 03.

-- Itens do calendário particular/SBIm da criança (aprovados pelo médico no checkpoint 05-02).
--   Estruturado age_months/age_months_max (para o diff por idade da Phase 6) + age_label humano (D-05).
--   week_min/week_max ficam null no eixo child_age. sort_order crescente por idade.
--   Inserido GLOBALMENTE (join no schedule por source/version), UMA VEZ, sem coluna de dono.
--   Cast explícito de age_months_max::integer: a coluna é null na maioria das linhas e o
--   Postgres infere `text` a partir do VALUES, quebrando com 42804 sem o cast (lição do 05-01).
insert into public.vaccine_schedule_items
  (schedule_id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)
select s.id, v.vaccine, v.dose, v.age_months, v.age_months_max::integer, null, null, v.age_label, v.sort_order, v.notes
from (values
  -- Ao nascer
  ('BCG',                                                                    'Dose única', 0,  null, 'Ao nascer',        0,   null),
  ('Hepatite B',                                                             'Ao nascer',  0,  null, 'Ao nascer',        1,   null),
  -- 2 meses
  ('Pentavalente (DTPa+Hib+HB) OU Hexavalente (DTPa+Hib+HB+VIP)',            '1ª dose',    2,  null, '2 meses',          10,  null),
  ('VIP (poliomielite inativada)',                                          '1ª dose',    2,  null, '2 meses',          11,  null),
  ('Pneumocócica conjugada (10 ou 13-valente)',                             '1ª dose',    2,  null, '2 meses',          12,  null),
  ('Rotavírus (monovalente ou pentavalente)',                               '1ª dose',    2,  null, '2 meses',          13,  null),
  -- 3 meses
  ('Meningocócica C ou ACWY (conjugada)',                                    '1ª dose',    3,  null, '3 meses',          20,  null),
  ('Meningocócica B (recombinante)',                                         '1ª dose',    3,  null, '3 meses',          21,  null),
  -- 4 meses
  ('Pentavalente/Hexavalente',                                               '2ª dose',    4,  null, '4 meses',          30,  null),
  ('VIP (poliomielite inativada)',                                          '2ª dose',    4,  null, '4 meses',          31,  null),
  ('Pneumocócica conjugada',                                                 '2ª dose',    4,  null, '4 meses',          32,  null),
  ('Rotavírus',                                                              '2ª dose',    4,  null, '4 meses',          33,  null),
  -- 5 meses
  ('Meningocócica C ou ACWY (conjugada)',                                    '2ª dose',    5,  null, '5 meses',          40,  null),
  ('Meningocócica B (recombinante)',                                         '2ª dose',    5,  null, '5 meses',          41,  null),
  -- 6 meses
  ('Pentavalente/Hexavalente',                                               '3ª dose',    6,  null, '6 meses',          50,  null),
  ('VIP (poliomielite inativada)',                                          '3ª dose',    6,  null, '6 meses',          51,  null),
  ('Pneumocócica conjugada',                                                 '3ª dose',    6,  null, '6 meses',          52,  null),
  ('Rotavírus (se esquema pentavalente)',                                    '3ª dose',    6,  null, '6 meses',          53,  null),
  ('Influenza (gripe)',                                                      'Anual (2 doses no 1º ano)', 6, 72, '6 meses a 5 anos', 54, null),
  ('Febre amarela',                                                          'Dose única (rever conforme região)', 9, null, '9 meses', 55, null),
  -- 12–15 meses
  ('Meningocócica B (recombinante)',                                         'Reforço',    12, 15,   '12–15 meses',      60,  null),
  ('Meningocócica C ou ACWY (conjugada)',                                    'Reforço',    12, 15,   '12–15 meses',      61,  null),
  ('Pneumocócica conjugada',                                                 'Reforço',    12, 15,   '12–15 meses',      62,  null),
  -- 12 meses
  ('Tríplice viral (SCR)',                                                   '1ª dose',    12, null, '12 meses',         63,  null),
  ('Hepatite A',                                                             '1ª dose',    12, null, '12 meses',         64,  null),
  ('Varicela',                                                               '1ª dose',    12, null, '12 meses',         65,  null),
  -- 15 meses
  ('DTPa (tríplice bacteriana acelular)',                                    '1º reforço', 15, null, '15 meses',         70,  null),
  ('VIP (poliomielite inativada)',                                          '1º reforço', 15, null, '15 meses',         71,  null),
  ('Tetra viral (SCR + varicela) OU tríplice viral + varicela',             '2ª dose',    15, null, '15 meses',         72,  null),
  -- 18 meses
  ('Hepatite A',                                                             '2ª dose',    18, null, '18 meses',         80,  null),
  -- 4 anos (48 meses)
  ('DTPa (tríplice bacteriana acelular)',                                    '2º reforço', 48, null, '4 anos',           90,  null),
  ('VIP (poliomielite inativada)',                                          '2º reforço', 48, null, '4 anos',           91,  null),
  ('Varicela',                                                               '2ª dose',    48, null, '4 anos',           92,  null),
  -- 5 anos (60 meses)
  ('Meningocócica ACWY (conjugada)',                                         'Reforço',    60, null, '5 anos',           100, null)
) as v(vaccine, dose, age_months, age_months_max, age_label, sort_order, notes)
join public.vaccine_schedules s
  on s.source = 'SBIm' and s.version = 'SBIm 2025'
where not exists (
    select 1 from public.vaccine_schedule_items i
    where i.schedule_id = s.id
      and i.vaccine = v.vaccine
      and i.dose is not distinct from v.dose
      and i.age_label = v.age_label
  );

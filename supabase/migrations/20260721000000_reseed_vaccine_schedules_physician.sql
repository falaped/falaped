-- Reseed dos calendários de vacina da CRIANÇA (SUS/PNI + particular/SBIm) a partir
-- da lista FINAL entregue pelo médico em PDF (Vacinas.pdf). Fonte da verdade clínica:
-- o médico. O executor NÃO autora valores clínicos — apenas transcreve fielmente o PDF,
-- mapeando cada item para as 11 faixas canônicas (lib/vaccine-bands.ts) via age_months
-- = início da faixa canônica, para que o agrupamento por bandForItemMonths funcione.
--
-- ESCOPO: apenas o eixo child_age (SUS + SBIm). NÃO tocar no calendário da gestante
-- (axis = 'gestational_weeks').
--
-- CAVEAT (ON DELETE CASCADE): patient_vaccine_doses.schedule_item_id referencia
-- vaccine_schedule_items ON DELETE CASCADE — o DELETE abaixo apaga as marcações de
-- dose existentes dos pacientes para SUS/SBIm. Aceitável em dev (dado de referência,
-- reseed único). Em produção com dados reais isso precisaria de remapeamento.
--
-- Run-once (DELETE + INSERT), envolvido em transação. Não idempotente.

begin;

-- 1) Apagar SOMENTE os itens dos calendários SUS e SBIm no eixo child_age.
--    A gestante (gestational_weeks) fica intocada.
delete from public.vaccine_schedule_items i
using public.vaccine_schedules s
where i.schedule_id = s.id
  and s.axis = 'child_age'
  and s.source in ('SUS', 'SBIm');

-- 2) Re-inserir os itens SUS/PNI do PDF do médico.
--    age_months = início da faixa canônica (posiciona no timeline); age_months_max,
--    week_min, week_max = null (posição-apenas). age_label = rótulo da faixa canônica.
--    notes = detalhe clínico do PDF (as anotações em ( )/{ }/[ ]), sentença PT-BR concisa.
--    Aspas simples escapadas como ''. sort_order crescente na ordem de leitura por faixa.
insert into public.vaccine_schedule_items
  (schedule_id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)
select s.id, v.vaccine, v.dose, v.age_months, v.age_months_max::integer, null, null, v.age_label, v.sort_order, v.notes
from (values
  -- Ao nascer (0)
  ('BCG',                              '1ª dose',       0,  null, 'Ao nascer',      0,  'Recém-nascidos com peso maior ou igual a 2.000 g. Preferência: aguardar o resultado do SCID no teste do pezinho para descartar imunodeficiência.'),
  ('Hepatite B (HepB)',                '1ª dose',       0,  null, 'Ao nascer',      1,  null),
  ('Nirsevimabe',                      'Dose única',    0,  null, 'Ao nascer',      2,  'Para RNPT e de risco. Recomendado para crianças menores de 12 meses em dose única; dos 12 aos menores de 24 meses, para crianças com maior risco.'),
  -- 2 meses (2)
  ('Pentavalente (DTP celular + Hib + HepB)', '1ª dose', 2, null, '2 meses',        10, 'DTP celular: difteria + tétano + coqueluche + Hib + HepB.'),
  ('VIP (poliomielite inativada)',     '1ª dose',       2,  null, '2 meses',        11, null),
  ('Pneumo 20',                        '1ª dose',       2,  null, '2 meses',        12, null),
  ('Rotavírus monovalente',            '1ª dose',       2,  null, '2 meses',        13, null),
  -- 3 meses (3)
  ('Meningocócica C',                  '1ª dose',       3,  null, '3 meses',        20, null),
  -- 4 meses (4) — repete as vacinas de 2 meses
  ('Pentavalente (DTP celular + Hib + HepB)', '2ª dose', 4, null, '4 meses',        30, 'DTP celular: difteria + tétano + coqueluche + Hib + HepB.'),
  ('VIP (poliomielite inativada)',     '2ª dose',       4,  null, '4 meses',        31, null),
  ('Pneumo 10',                        '2ª dose',       4,  null, '4 meses',        32, 'Em esquema de transição até finalizar as doses de Pneumo 10. VPC20 e VPC15 são intercambiáveis. O PNI recomenda esquema 2+1 com a VPC20 (transição: VPC20 aos 2 meses, VPC10 aos 4 meses e VPC20 aos 12 meses).'),
  ('Rotavírus monovalente',            '2ª dose',       4,  null, '4 meses',        33, null),
  -- 5 meses (5) — repete as vacinas de 3 meses
  ('Meningocócica C',                  '2ª dose',       5,  null, '5 meses',        40, null),
  -- 6 meses (6)
  ('Pentavalente (DTP celular + Hib + HepB)', '3ª dose', 6, null, '6 meses',        50, 'DTP celular: difteria + tétano + coqueluche + Hib + HepB.'),
  ('VIP (poliomielite inativada)',     '3ª dose',       6,  null, '6 meses',        51, null),
  ('Influenza trivalente',             '1ª dose',       6,  null, '6 meses',        52, null),
  ('Rotavírus',                        'Conforme vacina', 6, null, '6 meses',       53, 'Duas ou três doses, dependendo da vacina utilizada. Monovalente: 2 doses aos 2 e 4 meses. Pentavalente: 3 doses aos 2, 4 e 6 meses.'),
  -- 7 meses (7)
  ('COVID-19',                         '2ª dose',       7,  null, '7 meses',        60, null),
  ('Influenza trivalente',             '2ª dose',       7,  null, '7 meses',        61, null),
  -- A partir dos 9 meses (9)
  ('COVID-19',                         '3ª dose',       9,  null, '9 meses',        70, null),
  ('Febre amarela',                    '1ª dose',       9,  null, '9 meses',        71, 'Em casos de alto risco de contrair a doença, pode adiantar para 6 a 8 meses. Duas doses: aos 9 meses e aos 4 anos. Se a 1ª dose foi antes dos 5 anos, indicada 2ª dose; a partir dos 5 anos: dose única.'),
  -- 12 a 18 meses (12)
  ('Hepatite A',                       '1ª dose',       12, null, '12 a 18 meses',  80, 'Com 12 meses.'),
  ('Hepatite A',                       '2ª dose',       12, null, '12 a 18 meses',  81, 'Após 6 meses da 1ª dose, até os 18 meses.'),
  ('Tríplice viral (SCR)',             '1ª dose',       12, null, '12 a 18 meses',  82, 'Sarampo + caxumba + rubéola. Aos 12 meses.'),
  ('Varicela',                         '1ª dose',       12, null, '12 a 18 meses',  83, 'Aos 12 meses.'),
  ('Tríplice viral (SCR)',             '2ª dose',       12, null, '12 a 18 meses',  84, 'Reforço entre 15 e 24 meses.'),
  ('Varicela',                         '2ª dose',       12, null, '12 a 18 meses',  85, 'Reforço entre 15 e 24 meses.'),
  ('VIP (poliomielite)',               '1º reforço',    12, null, '12 a 18 meses',  86, null),
  ('Pneumo 20',                        'Reforço',       12, null, '12 a 18 meses',  87, 'Pneumocócicas conjugadas: duas ou três doses, dependendo da vacina utilizada.'),
  ('Meningocócica ACWY',               '1º reforço',    12, null, '12 a 18 meses',  88, 'Até 15 meses.'),
  ('Tríplice bacteriana (DTPw ou DTPa)', 'Reforço',     12, null, '12 a 18 meses',  89, 'Entre 15 e 18 meses.'),
  ('Meningocócica C',                  '1º reforço',    12, null, '12 a 18 meses',  90, null),
  -- 4 a 6 anos (48)
  ('VIP (poliomielite)',               '2º reforço',    48, null, '4 a 6 anos',     100, 'DTPa + VIP. Depende dos esquemas anteriores.'),
  ('DTP',                              '2º reforço',    48, null, '4 a 6 anos',     101, null),
  ('Febre amarela',                    '2ª dose',       48, null, '4 a 6 anos',     102, null),
  ('Qdenga (dengue, DENV-1,2,3,4)',    '1ª dose',       48, null, '4 a 6 anos',     103, 'A partir de 4 anos e, no SUS, de 10 a 14 anos. Independe de soropositividade prévia; não pode ser aplicada em imunodeprimidos. Esquema de 2 doses.'),
  ('Qdenga (dengue, DENV-1,2,3,4)',    '2ª dose',       48, null, '4 a 6 anos',     104, 'Após 3 meses da 1ª dose.'),
  -- 7 a 14 anos (84)
  ('dT (dupla adulto)',                'Reforço',       84, null, '7 a 14 anos',    110, null),
  ('HPV4',                             'Dose única',    84, null, '7 a 14 anos',    111, 'De 9 a 14 anos, no SUS. Uma dose para meninas e meninos de 9 a 14 anos.'),
  ('Meningocócica ACWY',               'Reforço',       84, null, '7 a 14 anos',    112, 'De 11 a 14 anos.')
) as v(vaccine, dose, age_months, age_months_max, age_label, sort_order, notes)
join public.vaccine_schedules s
  on s.source = 'SUS' and s.axis = 'child_age';

-- 3) Re-inserir os itens particulares/SBIm do PDF do médico.
insert into public.vaccine_schedule_items
  (schedule_id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)
select s.id, v.vaccine, v.dose, v.age_months, v.age_months_max::integer, null, null, v.age_label, v.sort_order, v.notes
from (values
  -- 2 meses (2)
  ('Hexavalente acelular (DTPa + Hib + HepB + VIP)', '1ª dose', 2, null, '2 meses',  10, 'DTP acelular: difteria + tétano + coqueluche, com Hib + HepB + VIP.'),
  ('Pneumo 13',                        '1ª dose',       2,  null, '2 meses',        11, null),
  ('Pneumo 15',                        '1ª dose',       2,  null, '2 meses',        12, null),
  ('Pneumo 20',                        '1ª dose',       2,  null, '2 meses',        13, null),
  ('Rotavírus pentavalente',           '1ª dose',       2,  null, '2 meses',        14, null),
  -- 3 meses (3)
  ('Meningocócica ACWY',               '1ª dose',       3,  null, '3 meses',        20, null),
  ('Meningocócica B',                  '1ª dose',       3,  null, '3 meses',        21, null),
  -- 4 meses (4)
  ('Hexavalente acelular (DTPa + Hib + HepB + VIP)', '2ª dose', 4, null, '4 meses',  30, 'DTP acelular: difteria + tétano + coqueluche, com Hib + HepB + VIP.'),
  ('Pneumo 13',                        '2ª dose',       4,  null, '4 meses',        31, null),
  ('Pneumo 15',                        '2ª dose',       4,  null, '4 meses',        32, null),
  ('Pneumo 20',                        '2ª dose',       4,  null, '4 meses',        33, 'Preferencialmente.'),
  ('Rotavírus pentavalente',           '2ª dose',       4,  null, '4 meses',        34, null),
  -- 5 meses (5)
  ('Meningocócica ACWY',               '2ª dose',       5,  null, '5 meses',        40, null),
  ('Meningocócica B',                  '2ª dose',       5,  null, '5 meses',        41, null),
  -- 6 meses (6)
  ('Hexavalente acelular (DTPa + Hib + HepB + VIP)', '3ª dose', 6, null, '6 meses',  50, 'DTP acelular: difteria + tétano + coqueluche, com Hib + HepB + VIP.'),
  ('Pneumo 20',                        '3ª dose',       6,  null, '6 meses',        51, 'Duas ou três doses, conforme vacina utilizada e condição clínica.'),
  ('COVID-19',                         '1ª dose',       6,  null, '6 meses',        52, 'Rotina para crianças de 6 meses até menores de 5 anos. Esquema de doses conforme a vacina utilizada (ver gov.br/saude — assuntos/covid-19).'),
  ('Influenza tetravalente',           '1ª dose',       6,  null, '6 meses',        53, null),
  ('Tríplice viral (SCR)',             'Dose zero',     6,  null, '6 meses',        54, 'Dose zero recomendada só em casos de surto de sarampo.'),
  -- 7 meses (7)
  ('Influenza tetravalente',           '2ª dose',       7,  null, '7 meses',        60, null),
  -- 12 a 18 meses (12)
  ('Pneumo 13',                        'Reforço',       12, null, '12 a 18 meses',  80, null),
  ('Pneumo 15',                        'Reforço',       12, null, '12 a 18 meses',  81, null),
  ('Pneumo 20',                        'Reforço',       12, null, '12 a 18 meses',  82, null),
  ('Meningocócica B',                  '1º reforço',    12, null, '12 a 18 meses',  83, 'Até 15 meses.'),
  ('Tetraviral (SCR + varicela)',      '1ª dose',       12, null, '12 a 18 meses',  84, 'Tríplice viral + varicela.'),
  ('Tetraviral (SCR + varicela)',      '2ª dose',       12, null, '12 a 18 meses',  85, 'Tríplice viral + varicela, após 3 meses da 1ª dose.'),
  -- 4 a 6 anos (48)
  ('Meningocócica ACWY',               '2º reforço',    48, null, '4 a 6 anos',     100, null),
  ('Pentavalente',                     'Reforço',       48, null, '4 a 6 anos',     101, null),
  ('Dengvaxia (dengue)',               '1ª dose',       48, null, '4 a 6 anos',     102, 'A partir dos 6 anos, apenas para crianças soropositivas para dengue e não imunodeprimidas.'),
  ('Dengvaxia (dengue)',               '2ª dose',       48, null, '4 a 6 anos',     103, 'A partir dos 6 anos, apenas para crianças soropositivas para dengue e não imunodeprimidas.'),
  -- 7 a 14 anos (84)
  ('Tríplice acelular (dTpa)',         'Reforço',       84, null, '7 a 14 anos',    110, 'De 9 a 11 anos, só no particular.'),
  ('HPV9',                             '1ª dose',       84, null, '7 a 14 anos',    111, 'A partir de 9 anos, esquema de 2 doses.'),
  ('HPV9',                             '2ª dose',       84, null, '7 a 14 anos',    112, 'Após 6 meses da 1ª dose, a partir dos 9 anos.')
) as v(vaccine, dose, age_months, age_months_max, age_label, sort_order, notes)
join public.vaccine_schedules s
  on s.source = 'SBIm' and s.axis = 'child_age';

commit;

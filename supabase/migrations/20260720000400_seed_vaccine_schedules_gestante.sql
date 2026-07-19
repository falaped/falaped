-- Seed dos ITENS do calendário da GESTANTE (CONTEÚDO CLÍNICO APROVADO PELO MÉDICO
-- no checkpoint human-verify 05-03 — Pitfall 3 / D-04 / T-05-04). O executor NÃO autora
-- os valores clínicos: o médico revisou e aprovou ("approved") as vacinas, doses e janelas
-- por semana gestacional do calendário da gestante (SBIm 2025) no checkpoint bloqueante do
-- plano 05-03. O médico assumiu a responsabilidade de conferir a acurácia contra a fonte
-- oficial atual (Calendário de vacinação da gestante — Sociedade Brasileira de Imunizações / SBIm).
-- Idempotente (where not exists): re-executar não duplica linhas.
--
-- DIVERGÊNCIA DELIBERADA (D-07): dado de referência GLOBAL, somente leitura.
-- Insere UMA ÚNICA VEZ, GLOBALMENTE — sem tabela de donos, sem fan-out por dono,
-- sem coluna de dono. NÃO replicar o modelo por-dono dos seeds de exam_catalog / guidance_templates.
--
-- Escopo deste plano (05-03): apenas os ITENS da gestante. A metadata do calendário da
-- gestante (source='gestante', axis='gestational_weeks', version='SBIm 2025') JÁ foi semeada
-- no plano 05-01 — NÃO reinserir nem atualizar.

-- Itens do calendário da gestante (aprovados pelo médico no checkpoint 05-03).
--   EIXO gestational_weeks (D-04): usa week_min/week_max (janela estruturada) + age_label humano (D-05).
--   week_max = null encoda "a partir de N semanas"; ambos preenchidos encoda "N–M semanas";
--   ambos null encoda janela livre ("qualquer momento").
--   age_months/age_months_max ficam null neste eixo (não é idade da criança).
--   sort_order crescente para ordenação determinística na lista por vacina.
--   Inserido GLOBALMENTE (join no schedule por source/version), UMA VEZ, sem coluna de dono.
--   Cast explícito de week_min::integer/week_max::integer: as colunas são null na maioria das
--   linhas e o Postgres infere `text` a partir do VALUES, quebrando com 42804 sem o cast
--   (lição do 05-01).
insert into public.vaccine_schedule_items
  (schedule_id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)
select s.id, v.vaccine, v.dose, null, null, v.week_min::integer, v.week_max::integer, v.age_label, v.sort_order, v.notes
from (values
  ('Hepatite B',                            '3 doses (0–1–6 meses)',          null, null, 'Qualquer momento da gestação', 0,  null),
  ('dTpa (tríplice bacteriana acelular)',   'A cada gestação',                20,   null, 'A partir de 20 semanas',       10, null),
  ('Influenza (gripe)',                     'Dose anual',                     null, null, 'Qualquer momento',             20, null),
  ('COVID-19',                              'Conforme recomendação vigente',  null, null, 'Qualquer momento',             30, null),
  ('VSR (Abrysvo)',                         'Dose única',                     28,   36,   '28–36 semanas',                40, null)
) as v(vaccine, dose, week_min, week_max, age_label, sort_order, notes)
join public.vaccine_schedules s
  on s.source = 'gestante' and s.version = 'SBIm 2025'
where not exists (
    select 1 from public.vaccine_schedule_items i
    where i.schedule_id = s.id
      and i.vaccine = v.vaccine
      and i.age_label = v.age_label
  );

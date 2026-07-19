-- Seed da biblioteca de orientações por marco (CONTEÚDO CLÍNICO APROVADO PELO MÉDICO
-- no checkpoint human-verify — Pitfall 3 / D-04). O executor NÃO autora os textos.
-- Modelo per-profile: insere os 10 pares {milestone → body} aprovados para cada profile.
-- Idempotente (where not exists): re-executar não duplica linhas.
-- NENHUM texto além dos 10 marcos aprovados foi adicionado ou alterado.

insert into public.guidance_templates (profile_id, milestone, body, sort_order)
select p.id, v.milestone, v.body, v.sort_order
from public.profiles p
cross join (
  values
    (
      '1ª consulta',
      'Aleitamento materno exclusivo em livre demanda; não oferecer água, chás ou outros leites. Sono seguro: deitar o bebê de barriga para cima, em colchão firme, berço livre de travesseiros e objetos. Coto umbilical limpo e seco. Manter triagem neonatal em dia (pezinho, orelhinha, olhinho, teste do coraçãozinho). Sinais de alerta para retorno imediato: febre, recusa alimentar, icterícia importante, dificuldade para respirar.',
      0
    ),
    (
      '1 mês',
      'Manter aleitamento materno exclusivo em livre demanda. Sono seguro (posição supina, berço livre de objetos). Estimular o vínculo: conversar, olhar, contato pele a pele. Banho de sol/vitamina D conforme orientação. Vacinas conforme o calendário.',
      1
    ),
    (
      '2 meses',
      'Aleitamento materno exclusivo. Reforçar sono seguro e prevenção de acidentes (nunca deixar sozinho em superfícies altas). Vacinas do 2º mês em dia. Estímulo visual e sonoro.',
      2
    ),
    (
      '4 meses',
      'Manter aleitamento materno exclusivo até os 6 meses. Iniciar rotina de sono. Segurança: atenção a objetos pequenos ao alcance (fase de levar à boca). Vacinas do 4º mês.',
      3
    ),
    (
      '6 meses',
      'Introdução alimentar a partir dos 6 meses, mantendo o aleitamento materno. Oferecer alimentos amassados, evitar açúcar e sal no 1º ano. Água nos intervalos. Prevenção de engasgo e acidentes. Vacinas do 6º mês.',
      4
    ),
    (
      '9 meses',
      'Alimentação da família adaptada, evitando ultraprocessados. Estímulo ao desenvolvimento motor (engatinhar, apoio). Segurança domiciliar (tomadas, escadas, produtos de limpeza). Higiene bucal ao surgirem os dentes.',
      5
    ),
    (
      '12 meses',
      'Alimentação variada junto à família; manter aleitamento se desejado. Estímulo à fala e à marcha. Segurança: quedas, afogamento, intoxicações. Escovação dos dentes. Vacinas de 12 meses.',
      6
    ),
    (
      '18 meses',
      'Reforçar alimentação saudável e limites com afeto. Estímulo à linguagem e autonomia. Segurança conforme mobilidade. Vacinas/reforços do calendário.',
      7
    ),
    (
      '24 meses',
      'Alimentação equilibrada, limitar telas, incentivar brincadeiras e sono adequado. Desfralde respeitando o ritmo da criança. Higiene bucal supervisionada. Reforços vacinais.',
      8
    ),
    (
      'Anual',
      'Acompanhamento de crescimento e desenvolvimento, hábitos alimentares e de sono, atividade física, tempo de tela, segurança conforme a idade e atualização vacinal.',
      9
    )
) as v(milestone, body, sort_order)
where not exists (
  select 1 from public.guidance_templates g
  where g.profile_id = p.id and g.milestone = v.milestone
);

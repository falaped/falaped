-- Seed do catálogo de exames e painéis default (CONTEÚDO CLÍNICO APROVADO PELO MÉDICO no checkpoint human-verify).
-- Modelo per-profile: insere os itens/painéis aprovados para cada profile existente.
-- Idempotente (where not exists): re-executar não duplica linhas.
-- NENHUM item ou painel além da lista aprovada (13 exames + 2 painéis) foi adicionado.

-- 1) Catálogo de exames aprovado (13 itens) — inserido por profile.
insert into public.exam_catalog_items (profile_id, name)
select p.id, v.name
from public.profiles p
cross join (
  values
    ('Hemograma completo'),
    ('EAS (urina tipo I)'),
    ('Urocultura'),
    ('Parasitológico de fezes (EPF)'),
    ('Glicemia de jejum'),
    ('Ferritina'),
    ('TSH'),
    ('T4 livre'),
    ('Perfil lipídico'),
    ('Vitamina D (25-OH)'),
    ('TGO/TGP'),
    ('Ureia e creatinina'),
    ('PCR')
) as v(name)
where not exists (
  select 1 from public.exam_catalog_items e
  where e.profile_id = p.id and e.name = v.name
);

-- 2) Painéis default aprovados (2 painéis) — inseridos por profile.
insert into public.exam_panels (profile_id, name, panel_items)
select p.id, v.name, v.panel_items
from public.profiles p
cross join (
  values
    (
      'Rotina lactente',
      array[
        'Hemograma completo',
        'Ferritina',
        'EAS (urina tipo I)',
        'Parasitológico de fezes (EPF)'
      ]
    ),
    (
      'Triagem escolar',
      array[
        'Hemograma completo',
        'Glicemia de jejum',
        'Perfil lipídico',
        'TSH'
      ]
    )
) as v(name, panel_items)
where not exists (
  select 1 from public.exam_panels ep
  where ep.profile_id = p.id and ep.name = v.name
);

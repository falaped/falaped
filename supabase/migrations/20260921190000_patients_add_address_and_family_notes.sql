-- Endereço da criança e observação livre sobre familiares (issue #39).
-- Ambos opcionais: a ficha existente continua válida sem eles.
-- family_notes é campo de observação por decisão do gestor (21/09/2026) — nada
-- estruturado, só o espaço para anotar nomes de outros familiares.

alter table public.patients
  add column if not exists address text,
  add column if not exists family_notes text;

comment on column public.patients.address is
  'Endereço onde a criança mora, em campo único. Pode divergir do endereço do responsável (pais separados, mora com avó).';

comment on column public.patients.family_notes is
  'Observação livre sobre familiares (nomes de mãe, pai, avós, irmãos). Texto, não estruturado.';

-- Catálogo de procedimentos por perfil + "Valor da Consulta" no perfil
-- (EARN-01, Fase 10). Pré-requisito do diálogo de encerramento: sem preço
-- cadastrado o diálogo não tem o que oferecer.
--
-- Molde exato: supabase/migrations/20260710020400_exam_catalog_items.sql
-- (tabela -> índice -> comment on table -> função set_updated_at_<tabela> ->
-- trigger before update -> enable row level security -> 4 policies own).
-- A única diferença é a coluna de preço.
--
-- D-04/D-14: catálogo por perfil, preço em CENTAVOS INTEIROS. Nenhum tipo de
-- ponto flutuante e nenhum tipo monetário nativo entra neste schema.
--
-- D-05 (one-way): price_cents existe para ser COPIADO por snapshot no
-- lançamento, não referenciado por join. Reajustar o preço aqui hoje NÃO
-- reescreve o faturamento já gravado — é isso que torna os totais auditáveis.
-- Consequência: apagar um item do catálogo é seguro, porque o lançamento já
-- copiou nome e centavos. Por isso a policy de DELETE aqui É apropriada
-- (dado de referência editável), diferente de public.financial_entries.

create table public.procedure_catalog_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  -- Preço em CENTAVOS INTEIROS (D-04/D-14). >= 0 (e não > 0) porque o médico
  -- pode catalogar um procedimento gratuito. O lançamento copia este valor por
  -- snapshot (D-05) — reajustar aqui NÃO reescreve o faturamento já gravado.
  price_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint procedure_catalog_items_price_non_negative check (price_cents >= 0),
  constraint procedure_catalog_items_name_not_blank check (btrim(name) <> '')
);

create index idx_procedure_catalog_items_profile_id on public.procedure_catalog_items (profile_id);

comment on table public.procedure_catalog_items is 'Catálogo de procedimentos por perfil, cada item com seu preço (D-04). Preço em centavos inteiros (D-14). O lançamento financeiro COPIA nome e centavos por snapshot (D-05), então reajustar ou apagar um item aqui não altera faturamento já gravado.';

comment on column public.procedure_catalog_items.price_cents is 'Preço do procedimento em centavos inteiros (D-04/D-14). Aceita 0 porque um procedimento gratuito é catalogável; negativo é barrado por procedure_catalog_items_price_non_negative. Copiado por snapshot para financial_entries.amount_cents (D-05).';

create or replace function public.set_updated_at_procedure_catalog_items()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_procedure_catalog_items_set_updated_at
  before update on public.procedure_catalog_items
  for each row
  execute function public.set_updated_at_procedure_catalog_items();

-- RLS owner-scoped por profile_id. Habilitar RLS + as 4 policies na mesma
-- migration (norma do repo pós-2026-06-04). A RLS `to authenticated` NÃO impõe
-- a assinatura — o gate `paid` é regra de app na action e no RSC.
alter table public.procedure_catalog_items enable row level security;

create policy "Procedure catalog items select own"
on public.procedure_catalog_items for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Procedure catalog items insert own"
on public.procedure_catalog_items for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Procedure catalog items update own"
on public.procedure_catalog_items for update to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
)
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Procedure catalog items delete own"
on public.procedure_catalog_items for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- "Valor da Consulta" (D-03): valor padrão cobrado por uma consulta, usado em
-- todo encerramento de caso. Molde:
-- supabase/migrations/20260316020000_profiles_add_default_location_state_and_city.sql
--
-- NULLABLE de propósito: um perfil que já existe não pode ganhar um valor
-- padrão de zero (zero é um preço válido e mentiria sobre a configuração).
-- NULL significa "ainda não configurado" e o diálogo abre com o campo vazio.

alter table public.profiles
  add column if not exists consultation_price_cents integer null;

alter table public.profiles
  add constraint profiles_consultation_price_non_negative
  check (consultation_price_cents is null or consultation_price_cents >= 0);

comment on column public.profiles.consultation_price_cents is 'Valor padrão da consulta em centavos inteiros (D-03/D-14). NULL = ainda não configurado — o diálogo de encerramento abre com o campo vazio.';

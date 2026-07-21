-- Regras de disponibilidade semanal do médico (AGENDA-01, Fase 6).
-- Uma linha por FAIXA de atendimento em um dia da semana. O médico pode ter
-- MÚLTIPLAS faixas no mesmo weekday (ex.: 08:00–12:00 e 14:00–18:00), por isso
-- NÃO há unique em (profile_id, weekday) (D-02). Cada faixa carrega sua própria
-- `slot_minutes`, permitindo granularidade distinta por período (D-09).
--
-- Persistência de REGRAS apenas — nenhum slot individual é materializado aqui;
-- a expansão em slots é pura/derivada (Plano 02, D-12). Nenhuma FK/coluna de
-- consulta é adicionada: a Fase 7 escreve appointments POR CIMA (forward
-- constraint), sem tocar nesta tabela.
--
-- OWNED table: dado do próprio médico, escopo owner por profile_id + RLS
-- owner-scoped, espelhando public.patient_vaccine_doses (D-13).
--
-- Convenção de weekday: 0=domingo .. 6=sábado, casando com date-fns getDay()
-- (documentado em comment on column abaixo).

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null,
  start_minute smallint not null,
  end_minute smallint not null,
  slot_minutes smallint not null,
  created_at timestamptz not null default now(),
  constraint availability_rules_weekday_range check (weekday between 0 and 6),
  constraint availability_rules_end_after_start check (end_minute > start_minute),
  constraint availability_rules_start_multiple_30 check (start_minute % 30 = 0),
  constraint availability_rules_end_multiple_30 check (end_minute % 30 = 0),
  constraint availability_rules_slot_positive check (slot_minutes > 0)
);

comment on table public.availability_rules is
  'Regras de disponibilidade semanal do médico (AGENDA-01, Fase 6). Uma linha por faixa; múltiplas faixas por weekday permitidas (sem unique em profile_id+weekday, D-02); slot_minutes por faixa (D-09). Somente regras — nenhum slot materializado (D-12). Escopo owner por profile_id.';

comment on column public.availability_rules.weekday is
  'Dia da semana: 0=domingo .. 6=sábado (casa com date-fns getDay()).';

comment on column public.availability_rules.start_minute is
  'Início da faixa em minutos desde 00:00 (múltiplo de 30).';

comment on column public.availability_rules.end_minute is
  'Fim da faixa em minutos desde 00:00 (múltiplo de 30, maior que start_minute).';

comment on column public.availability_rules.slot_minutes is
  'Duração de cada slot desta faixa em minutos (> 0, D-09).';

create index idx_availability_rules_profile_weekday
  on public.availability_rules (profile_id, weekday);

-- RLS: owner-scoped por profile_id. Regra: enable RLS e criar TODAS as policies
-- na MESMA migration (D-13) — RLS sem policy = negação silenciosa (zero linhas,
-- sem erro). Espelha patient_vaccine_doses.

alter table public.availability_rules enable row level security;

create policy "Availability rules select own"
on public.availability_rules for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Availability rules insert own"
on public.availability_rules for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Availability rules update own"
on public.availability_rules for update to authenticated
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

create policy "Availability rules delete own"
on public.availability_rules for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

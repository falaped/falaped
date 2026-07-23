-- Consultas (APPT-01..04, Fase 7). Tabela owner-scoped ligada a patients, com
-- ciclo de status por enum e garantia de NÃO-double-booking no banco.
--
-- O único componente que OBRIGATORIAMENTE vive no banco é a exclusion constraint
-- parcial (APPT-04 / D-08): é a única invariante que a aplicação não consegue
-- garantir sob concorrência (TOCTOU). A legalidade das transições de status é
-- regra de app (state machine no action); o enum só restringe o domínio de valores.
--
-- Instante da consulta: gravado direto dos instantes UTC que expandAvailability
-- (Fase 6) já emite — SEM re-derivação de fuso no banco (evita bugs de DST).
--
-- btree_gist é necessário ANTES do CREATE TABLE (Pitfall 1): habilita o operador
-- '=' sobre profile_id (uuid) num índice GiST junto do '&&' de overlap de range.
create extension if not exists btree_gist with schema extensions;

-- Enum do ciclo de status (APPT-02). Valores em inglês (coluna "DB value" da
-- UI-SPEC); rótulos PT-BR vivem no badge da UI — mesma convenção de patient_sex.
create type public.appointment_status as enum (
  'pending',    -- solicitada (pedido a confirmar) — segura o horário
  'confirmed',  -- confirmada — segura o horário
  'done',       -- realizada — final, NÃO segura
  'no_show',    -- falta — final, NÃO segura, distinta de cancelada
  'canceled'    -- cancelada / recusada — final, NÃO segura, libera o horário
);

comment on type public.appointment_status is
  'Ciclo da consulta (APPT-02): pending (solicitada) -> confirmed -> done|no_show|canceled. pending+confirmed seguram o horário (exclusion constraint); done/no_show/canceled são finais e não seguram. no_show (falta) é distinta de canceled.';

-- Tabela owner-scoped (molde patient_vaccine_doses).
-- DEVIAÇÃO PINADA (research A3 / Pitfall 5 / D-08): patient_id usa ON DELETE
-- RESTRICT (NÃO cascade) para preservar o histórico de consultas que a Fase 10
-- (ganhos -> consulta FK) vai referenciar — um paciente com consultas não pode
-- ser apagado. profile_id mantém ON DELETE CASCADE (apagar o médico apaga tudo dele).
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  status public.appointment_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_ends_after_starts check (ends_at > starts_at),

  -- NÃO-DOUBLE-BOOKING (APPT-04 / D-08): impede duas consultas que "seguram" o
  -- horário (pending/confirmed) do MESMO médico (profile_id) com intervalos
  -- sobrepostos. O predicado parcial WHERE status in ('pending','confirmed')
  -- implementa D-07: estados finais não entram no índice, então o horário fica
  -- livre para re-marcar (a consulta histórica continua visível na agenda).
  -- Range meio-aberto '[)' casa com a semântica de slot da Fase 6 (D-11): dois
  -- slots adjacentes (end==start) NÃO conflitam (Pitfall 2).
  constraint appointments_no_double_booking
    exclude using gist (
      profile_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    )
    where (status in ('pending', 'confirmed'))
);

comment on table public.appointments is
  'Consultas do médico (APPT-01..04). Owner-scoped por profile_id, ligada a patients (ON DELETE RESTRICT preserva histórico para a FK de ganhos da Fase 10). starts_at/ends_at são instantes UTC gravados de expandAvailability (Fase 6). Exclusion constraint parcial garante não-double-booking sobre pending+confirmed.';

create index idx_appointments_profile_starts on public.appointments (profile_id, starts_at);

-- RLS owner-scoped por profile_id (D-09). Habilitar RLS + as 4 policies na mesma
-- migration (molde patient_vaccine_doses). A RLS `to authenticated` NÃO impõe a
-- assinatura — o gate `paid` é regra de app na action e no RSC.
alter table public.appointments enable row level security;

create policy "Appointments select own"
on public.appointments for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Appointments insert own"
on public.appointments for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Appointments update own"
on public.appointments for update to authenticated
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

create policy "Appointments delete own"
on public.appointments for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

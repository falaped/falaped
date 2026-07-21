-- Exceções de disponibilidade do médico (AGENDA-03, Fase 6).
-- Camada SUBTRATIVA sobre as regras semanais: uma linha remove disponibilidade
-- em uma data específica. Faixa null (start_minute e end_minute ambos null) =
-- dia inteiro indisponível; faixa preenchida = bloqueio parcial daquele intervalo
-- (D-04/D-05). CHECK garante ambos-ou-nenhum.
--
-- APENAS subtrativa (D-05): nenhuma coluna additive/type nem FK de consulta é
-- adicionada — a Fase 7 escreve appointments por cima (forward constraint).
--
-- OWNED table: escopo owner por profile_id + RLS owner-scoped (D-13),
-- espelhando public.availability_rules.

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  exception_date date not null,
  start_minute smallint,
  end_minute smallint,
  created_at timestamptz not null default now(),
  constraint availability_exceptions_both_or_neither
    check ((start_minute is null) = (end_minute is null)),
  constraint availability_exceptions_range_valid
    check (
      start_minute is null
      or (
        end_minute > start_minute
        and start_minute % 30 = 0
        and end_minute % 30 = 0
      )
    )
);

comment on table public.availability_exceptions is
  'Exceções de disponibilidade do médico (AGENDA-03, Fase 6). Subtrativa; faixa null = dia inteiro indisponível, faixa preenchida = bloqueio parcial (D-04/D-05). Escopo owner por profile_id.';

comment on column public.availability_exceptions.exception_date is
  'Data da exceção (fuso fixo da clínica America/Sao_Paulo).';

comment on column public.availability_exceptions.start_minute is
  'Início do bloqueio em minutos desde 00:00 (múltiplo de 30) ou null = dia inteiro.';

comment on column public.availability_exceptions.end_minute is
  'Fim do bloqueio em minutos desde 00:00 (múltiplo de 30) ou null = dia inteiro.';

create index idx_availability_exceptions_profile_date
  on public.availability_exceptions (profile_id, exception_date);

-- RLS: owner-scoped por profile_id. Enable RLS + TODAS as policies na MESMA
-- migration (D-13) — RLS sem policy = negação silenciosa.

alter table public.availability_exceptions enable row level security;

create policy "Availability exceptions select own"
on public.availability_exceptions for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Availability exceptions insert own"
on public.availability_exceptions for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Availability exceptions update own"
on public.availability_exceptions for update to authenticated
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

create policy "Availability exceptions delete own"
on public.availability_exceptions for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

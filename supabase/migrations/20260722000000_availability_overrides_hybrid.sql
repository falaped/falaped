-- Evolução HÍBRIDA da disponibilidade do médico (AGENDA-05, Fase 6 — redesign v2).
--
-- PORQUÊ desta migration:
--   A v1 desta fase entregou `availability_exceptions` como camada APENAS
--   subtrativa (folga: dia inteiro ou faixa parcial, D-04/D-05). O redesign v2
--   (D-20) torna a disponibilidade HÍBRIDA: o template recorrente
--   (`availability_rules`) continua sendo a base, e cada linha de override por
--   data pode ser SUBTRATIVA (folga — a antiga exceção) OU ADITIVA (abre horário
--   extra pontual fora do template, AGENDA-05).
--
--   Esta migration EVOLUI a tabela existente via ALTER + backfill (D-22):
--   preservamos TODAS as rows já cadastradas (regras + folgas de teste), a RLS e
--   as 4 policies owner-scoped. NUNCA drop/recreate — recriar a tabela derrubaria
--   silenciosamente a RLS/policies (RLS sem policy = negação silenciosa: zero
--   linhas, sem erro) e perderia as folgas v1. As folgas v1 existentes são
--   mapeadas para o novo conceito de override subtrativo (`override_type =
--   'subtract'`), sem perda.
--
--   Mantemos deliberadamente os nomes `availability_exceptions` e `exception_date`
--   (decisão do planner/RESEARCH §Migração): renomear é cosmético e o custo de
--   refatorar módulos/actions/tipos que os referenciam supera o benefício. Os
--   conceitos são renomeados apenas no código (tipos `AvailabilityOverride*`).
--
--   Forward constraint (Fase 7 / APPT-*): appointments serão escritos POR CIMA da
--   disponibilidade — nenhuma FK/coluna de consulta é adicionada aqui.

-- --------------------------------------------------------------------------
-- 1) override_type: distingue aditivo de subtrativo. Default 'subtract' porque
--    as rows existentes (folgas v1, D-20) são todas subtrativas.
-- --------------------------------------------------------------------------
alter table public.availability_exceptions
  add column override_type text not null default 'subtract'
  check (override_type in ('add', 'subtract'));

-- Backfill auditável (D-22): garante que qualquer row v1 (mesmo que o default não
-- tenha sido aplicado por algum caminho) fique explicitamente 'subtract'.
update public.availability_exceptions
  set override_type = 'subtract'
  where override_type is null;

-- --------------------------------------------------------------------------
-- 2) slot_minutes: duração POR FAIXA do override aditivo (AGENDA-05/D-09).
--    Nullable — só faz sentido em aditivos com faixa; folgas o deixam null.
-- --------------------------------------------------------------------------
alter table public.availability_exceptions
  add column slot_minutes smallint;

-- --------------------------------------------------------------------------
-- 3) Teto de minutos (WR-03): 1440 = 24:00 (fim do dia alcançável, coerente com
--    WR-04). Impede faixa vazando para o dia seguinte. start/end podem ser null
--    (folga dia-inteiro), por isso o CHECK guarda o null.
-- --------------------------------------------------------------------------
alter table public.availability_exceptions
  add constraint availability_exceptions_minute_ceiling
  check (
    start_minute is null
    or (start_minute <= 1440 and end_minute <= 1440)
  );

-- --------------------------------------------------------------------------
-- 4) Aditivo exige faixa + duração: um override 'add' não pode ser dia-inteiro
--    (não faz sentido "abrir o dia todo" sem faixa/duração). Subtrativo continua
--    livre (dia inteiro OU faixa parcial).
-- --------------------------------------------------------------------------
alter table public.availability_exceptions
  add constraint availability_exceptions_add_needs_range_and_slot
  check (
    override_type = 'subtract'
    or (
      start_minute is not null
      and end_minute is not null
      and slot_minutes is not null
      and slot_minutes > 0
    )
  );

comment on column public.availability_exceptions.override_type is
  'Tipo do override (D-20): ''subtract'' = folga (remove disponibilidade, comportamento v1) | ''add'' = disponibilidade extra pontual fora do template (AGENDA-05). Default ''subtract'' (rows v1 são folgas).';

comment on column public.availability_exceptions.slot_minutes is
  'Duração de cada slot deste override em minutos (> 0). Usado apenas em overrides aditivos (AGENDA-05/D-09); null em folgas subtrativas.';

-- --------------------------------------------------------------------------
-- 5) Teto de minutos também em availability_rules (WR-03) — mesma coerência
--    1440 = fim do dia. Espelha o estilo de CHECK nomeado da migration v1.
-- --------------------------------------------------------------------------
alter table public.availability_rules
  add constraint availability_rules_minute_ceiling
  check (start_minute <= 1440 and end_minute <= 1440);

-- NÃO reemitir `enable row level security` nem as 4 policies de
-- availability_exceptions: o ALTER preserva a RLS e as policies já existentes
-- (D-22). Reemiti-las seria redundante e arriscaria erro de policy duplicada.

-- Lançamentos financeiros do médico (EARN-01..05, Fase 10).
--
-- (a) LIVRO-CAIXA DE ENTRADA. Todo valor em CENTAVOS INTEIROS (D-14) — nunca
--     ponto flutuante, nunca decimal-em-reais, nunca tipo monetário nativo.
--     amount_cents é integer (teto ~R$ 21,4 mi por linha) e sum(integer) no
--     Postgres já promove a bigint, então o total de um período não estoura.
--
-- (b) ÂNCORA (D-01/DV-1): o lançamento pendura em cases(id) (caso encerrado) ou
--     em nada (avulso). NÃO existe coluna de agendamento nesta tabela e nenhuma
--     referência à tabela da agenda — o vínculo com a agenda saiu de vez.
--     case_id é nullable (D-02) e NÃO tem unique: um atendimento gera 1 linha de
--     consulta + N linhas de procedimento (D-08). Duas linhas com o mesmo
--     amount_cents, o mesmo received_on e o mesmo case_id são duas linhas
--     distintas — nada é mesclado nem deduplicado.
--
-- (c) RLS DE ÂNCORA SIMPLES por profile_id, DELIBERADA. Diferente de
--     supabase/migrations/20260604000003_rls_cases.sql, que usa a âncora DUPLA
--     (profile_id OR user_phone) porque cases.profile_id é nullable e casos de
--     origem WhatsApp podem chegar só com telefone. Aqui profile_id é NOT NULL e
--     estampado server-side pela action: dinheiro tem exatamente um dono, e um
--     segundo caminho de posse por string de telefone tornaria a soma "de quem?"
--     ambígua.
--
--     CONSEQUÊNCIA, DITA EM VOZ ALTA: como esta policy NUNCA olha para
--     public.cases, o case_id que chega do cliente NÃO é coberto por RLS. É uma
--     superfície de IDOR e é a ACTION que tem de fechá-la, validando a posse do
--     caso pela mesma resolução profile_id -> authenticated_users.phone ->
--     cases.user_phone que modules/cases/update-case-status.ts já usa.
--
-- (d) AUDITORIA (D-19): corrigir é ANULAR (voided_at), nunca apagar. Por isso
--     esta tabela NÃO tem policy de DELETE — a RLS nega DELETE por default, e
--     essa ausência é a garantia mais barata de que nenhum caminho de app apaga
--     faturamento. O on delete cascade de profile_id continua valendo (apagar a
--     conta apaga tudo do dono), porque FK cascade não passa por policy.
--
-- (e) D-26 REVISADA NO CHECKPOINT DESTE PLANO: a FK case_id usa
--     ON DELETE RESTRICT, não cascade. O PLAN.md de 10-01 foi escrito com
--     cascade e o usuário reabriu a decisão, escolhendo restrict.
--     Restrict alinha com o precedente escrito do repo —
--     supabase/migrations/20260722200000_appointments.sql escolheu
--     `on delete restrict` em patient_id com o comentário "para preservar o
--     histórico de consultas que a Fase 10 (ganhos -> consulta FK) vai
--     referenciar" — e com a LETRA de D-19 (faturamento não se apaga).
--     Com cascade, excluir um caso apagaria os lançamentos dele e o total de um
--     mês já fechado poderia mudar depois; a única barreira seria uma string de
--     UI. Com restrict a barreira é o BANCO.
--     Preço do restrict, a pagar em plano posterior: um caso com lançamento
--     (mesmo anulado) não pode ser apagado, e actions/cases/delete-case.ts tem
--     de traduzir o erro Postgres 23503 (foreign_key_violation) num result union
--     PT-BR, e o diálogo destrutivo passa a BLOQUEAR a exclusão ("anule os
--     lançamentos antes de excluir") em vez de avisar.
--
-- (f) GATE DE ASSINATURA: a RLS `to authenticated` NÃO impõe a assinatura — o
--     gate `paid` é regra de app, na action e no RSC. Mesma nota que
--     supabase/migrations/20260722200000_appointments.sql já registra.

create type public.payment_method as enum (
  'pix',        -- Pix
  'cash',       -- Dinheiro
  'card',       -- Cartão
  'insurance'   -- Convênio
);

comment on type public.payment_method is 'Forma de pagamento do lançamento (D-12): pix | cash | card | insurance. Valores em inglês; os rótulos PT-BR (Pix / Dinheiro / Cartão / Convênio) vivem na UI — mesma convenção dos demais enums deste schema.';

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- Caso de origem. NULL = lançamento avulso (EARN-02/D-02). ON DELETE RESTRICT
  -- preserva a integridade do livro-caixa: um caso com lançamento não pode ser
  -- apagado. Ver item (e) do cabeçalho — D-26 revisada no checkpoint.
  case_id uuid references public.cases(id) on delete restrict,

  -- SNAPSHOT do rótulo (D-05): "Consulta", o nome do procedimento no momento da
  -- gravação, ou a descrição livre do avulso (D-13). SEMPRE preenchida — é o que
  -- torna o lançamento reconhecível meses depois sem depender de join.
  description text not null,

  -- SNAPSHOT do preço (D-05/D-14): centavos inteiros, copiados no ato da
  -- gravação. Reajustar o catálogo depois não reescreve esta linha.
  amount_cents integer not null,

  payment_method public.payment_method not null,

  -- Data de RECEBIMENTO escolhida pelo médico (D-11), não o instante do
  -- encerramento. Tipo `date` DE PROPÓSITO: é um dia de calendário, então
  -- date_trunc sobre ela já é o bucket local — zero conversão de fuso, zero
  -- risco de DST na agregação (EARN-03).
  received_on date not null,

  -- Anulação/estorno (D-19..D-22). NULL = o lançamento vale; timestamp = anulado.
  voided_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint financial_entries_amount_positive check (amount_cents > 0),
  constraint financial_entries_description_not_blank check (btrim(description) <> '')
);

comment on table public.financial_entries is 'Livro-caixa de entrada do médico (EARN-01..05). Valores em centavos inteiros; preço e rótulo congelados por snapshot (D-05). case_id nullable = avulso (D-02), sem unique (N linhas por caso, D-08), com on delete restrict (D-26 revisada). Anulação por voided_at, nunca delete (D-19) — tabela sem policy de DELETE. Buckets do painel pela received_on (dia local da clínica).';

comment on column public.financial_entries.received_on is 'Data de recebimento escolhida pelo médico (D-11). Tipo date e não timestamptz: é um dia de calendário, então date_trunc já devolve o bucket local sem conversão de fuso.';

comment on column public.financial_entries.voided_at is 'Anulação (D-19): NULL = vale, timestamp = anulado. Qualquer total ou média filtra voided_at is null.';

-- Índice do painel: cobre o range de received_on por dono já filtrando anulados.
-- Índice PARCIAL — o filtro de anulados vive DENTRO do índice, então o plano da
-- agregação nunca lê linha anulada.
create index idx_financial_entries_profile_received_active
  on public.financial_entries (profile_id, received_on)
  where voided_at is null;

-- Atende exatamente o predicado da guarda de re-encerramento (D-10) e da lista
-- de lançamentos dentro do caso (D-20).
create index idx_financial_entries_case_active
  on public.financial_entries (case_id)
  where voided_at is null and case_id is not null;

create or replace function public.set_updated_at_financial_entries()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_financial_entries_set_updated_at
  before update on public.financial_entries
  for each row
  execute function public.set_updated_at_financial_entries();

alter table public.financial_entries enable row level security;

create policy "Financial entries select own"
on public.financial_entries for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Financial entries insert own"
on public.financial_entries for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- UPDATE existe para anular/desanular (voided_at) — NÃO para editar valor
-- (D-19). Isso é regra de app: a action de anulação só escreve voided_at.
create policy "Financial entries update own"
on public.financial_entries for update to authenticated
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

-- A AUSÊNCIA de uma policy de exclusão é deliberada (D-19): sem ela a RLS nega
-- a operação por default e nenhum caminho de app consegue apagar faturamento.

-- Agregação do painel de Ganhos (EARN-03/EARN-04).
--
-- POR QUÊ NO BANCO: date_trunc não é expressável na cláusula select do
-- PostgREST e EARN-03 exige agregação em SQL. Molde do envelope:
-- supabase/migrations/20260722100000_save_availability_rpc.sql — SECURITY
-- INVOKER (a RLS owner-scoped continua valendo como defesa em profundidade) +
-- set search_path = '' + nomes totalmente qualificados (evita o advisor
-- function_search_path_mutable e sequestro de search_path).
--
-- FUSO (D-25): NÃO existe expressão de conversão de fuso aqui, de propósito.
-- received_on é `date` (um dia de calendário escolhido pelo médico, D-11), então
-- date_trunc já devolve o bucket local. O único fuso da feature é derivar
-- "hoje" e a janela do período, e isso o RSC faz com tz(CLINIC_TIME_ZONE) e
-- passa pronto em p_today/p_from/p_to.
--
-- STABLE + uma única leitura: cards, total, média e série vêm todos do mesmo
-- snapshot e não podem discordar entre si.
create or replace function public.get_earnings_summary(
  p_profile_id uuid,
  p_from date,     -- início do período navegado (inclusivo)
  p_to date,       -- fim do período navegado (EXCLUSIVO, janela meio-aberta)
  p_today date     -- "hoje" na data local da clínica, calculado no RSC
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    -- Sem filtro de data: os cards hoje/semana/mês são relativos a p_today e
    -- independem do período navegado (o médico pode estar olhando março).
    --
    -- O filtro de anulados (D-21) vive AQUI, no único caminho que produz os
    -- números, para que nenhum caller possa esquecê-lo.
    select fe.amount_cents, fe.case_id, fe.received_on
    from public.financial_entries fe
    where fe.profile_id = p_profile_id
      and fe.voided_at is null
      -- Owner-check redundante (defesa contra IDOR, igual save_availability):
      -- a RLS já negaria as linhas, isto só torna a intenção explícita.
      and exists (
        select 1 from public.profiles p
        where p.id = p_profile_id and p.auth_user_id = auth.uid()
      )
  ),
  win as (
    -- Janela MEIO-ABERTA: received_on = p_from entra, received_on = p_to não.
    select * from scoped
    where received_on >= p_from and received_on < p_to
  ),
  cards as (
    -- date_trunc('week', ...) começa na SEGUNDA por definição ISO 8601, então
    -- D-25 é atendida sem nenhum parâmetro extra: um lançamento de domingo
    -- pertence à semana iniciada na segunda anterior.
    select
      coalesce(sum(amount_cents) filter (
        where received_on = p_today
      ), 0)::bigint as today_cents,
      coalesce(sum(amount_cents) filter (
        where date_trunc('week', received_on) = date_trunc('week', p_today)
      ), 0)::bigint as week_cents,
      coalesce(sum(amount_cents) filter (
        where date_trunc('month', received_on) = date_trunc('month', p_today)
      ), 0)::bigint as month_cents
    from scoped
  ),
  period as (
    select
      coalesce(sum(amount_cents), 0)::bigint as period_cents,
      -- DENOMINADOR DA MÉDIA (DV-2/D-17): casos DISTINTOS com lançamento +
      -- avulsos contados individualmente. count(distinct case_id) ignora NULL
      -- por definição de SQL, então as duas parcelas nunca se sobrepõem nem
      -- contam duas vezes: 3 lançamentos no mesmo caso valem 1, 3 avulsos
      -- valem 3.
      (count(distinct case_id)
        + count(*) filter (where case_id is null))::bigint as attendances
    from win
  ),
  by_day as (
    -- Ordenada no SQL: nenhum consumidor reordena em JS.
    select received_on, sum(amount_cents)::bigint as cents
    from win
    group by received_on
    order by received_on
  )
  select jsonb_build_object(
    'today_cents',   c.today_cents,
    'week_cents',    c.week_cents,
    'month_cents',   c.month_cents,
    'period_cents',  p.period_cents,
    'attendances',   p.attendances,
    -- ARREDONDAMENTO ÚNICO (D-17): uma única divisão e um único arredondamento,
    -- em precisão arbitrária (não em ponto flutuante), resultado já em centavos
    -- inteiros. A UI NUNCA recalcula a média, e a média do período NUNCA é
    -- média de médias por bucket.
    'average_cents',
      case when p.attendances = 0 then 0
           else round(p.period_cents::numeric / p.attendances)::bigint end,
    -- O coalesce é o que garante [] e não null num período vazio.
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('received_on', received_on, 'cents', cents))
      from by_day
    ), '[]'::jsonb)
  )
  from cards c cross join period p;
$$;

comment on function public.get_earnings_summary(uuid, date, date, date) is 'Agregação do painel de Ganhos (EARN-03/EARN-04): cards hoje/semana/mês relativos a p_today, total e média do período [p_from, p_to) e série diária. Filtra voided_at is null (D-21). Buckets por date_trunc sobre received_on, sem conversão de fuso e sem DST. Média = total ÷ (casos distintos + avulsos) com arredondamento único (DV-2/D-17). SECURITY INVOKER + owner-check por auth.uid(). Com zero lançamentos devolve todos os escalares em 0 e by_day = [], nunca null.';

revoke all on function public.get_earnings_summary(uuid, date, date, date) from public;
grant execute on function public.get_earnings_summary(uuid, date, date, date) to authenticated;

-- Correções da revisão de código da Fase 10 sobre o livro-caixa (WR-03 e WR-04).
--
-- POR QUE UMA MIGRATION NOVA E NÃO UMA EDIÇÃO DE
-- supabase/migrations/20260821000100_financial_entries.sql: aquele arquivo JÁ FOI
-- APLICADO no banco. Editar migration aplicada faz o arquivo mentir sobre o estado
-- real do banco — quem lê o histórico passa a ver uma verdade que nunca rodou, e
-- um ambiente novo (recriado do zero) divergiria do ambiente atual sem nenhum
-- aviso. Correção de banco aplicado é migration nova, sempre.
--
-- (WR-03) ORDENAÇÃO DA SÉRIE DIÁRIA. A CTE `by_day` carregava `order by
--   received_on` e tanto o módulo quanto o gráfico documentam que "a série vem
--   pronta do SQL; nenhum consumidor reordena em JS". Só que o PostgreSQL NÃO
--   promete que uma ordenação dentro de uma CTE sobreviva até o agregado que a
--   consome: uma CTE referenciada uma única vez é inlinável desde o PG12, e
--   `jsonb_agg` não tem garantia de ordem sem um `ORDER BY` DENTRO do agregado.
--   Se o plano mudar, o gráfico de barras plota os dias fora de ordem (eixo X
--   `31, 4, 12, …`) e nada em lugar nenhum dá erro. A ordem passa a ser parte do
--   agregado, que é o único lugar onde ela é garantida; o `order by` decorativo
--   da CTE sai.
--
-- (WR-04) D-19 VIRA FATO DE BANCO, NÃO REGRA DE APP. A migration anterior fez da
--   AUSÊNCIA de policy de DELETE a garantia mais barata de que nada apaga
--   faturamento — e o mesmo argumento vale para EDITAR valor, que D-19 proíbe
--   com as mesmas palavras ("corrigir é ANULAR, nunca apagar"). Só que a policy
--   de UPDATE é escopada por LINHA, e o privilégio de UPDATE era da TABELA
--   INTEIRA: o dono podia fazer
--   `PATCH /rest/v1/financial_entries?id=eq.<uuid>` com
--   `{"amount_cents": 1}` pelo console do browser, com a própria sessão, e
--   reescrever um mês fechado sem nunca anular a linha. Numa feature de
--   auditoria isso é o elo mais fraco. O recorte de coluna resolve pelo mesmo
--   preço da policy de DELETE que não existe.
--
--   Compatível com os dois únicos caminhos de UPDATE do app: `voidFinancialEntry`
--   escreve `{ voided_at: <timestamp> }` e `restoreFinancialEntry` escreve
--   `{ voided_at: null }` — nada mais, afirmado por spec com mock gravador
--   (modules/financial-entries/void-financial-entry.spec.ts). O trigger
--   `trg_financial_entries_set_updated_at` continua valendo: o Postgres checa
--   privilégio de coluna sobre a lista do SET do comando, não sobre o que um
--   trigger escreve em NEW.

-- WR-03: ordenação dentro do agregado.
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
    -- SEM `order by` aqui: a ordenação vive no jsonb_agg abaixo, que é o único
    -- lugar onde o PostgreSQL a garante (WR-03).
    select received_on, sum(amount_cents)::bigint as cents
    from win
    group by received_on
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
    -- O `order by` DENTRO do jsonb_agg é a garantia de ordem da série (WR-03):
    -- o gráfico plota na ordem em que recebe e não reordena em JS.
    'by_day', coalesce((
      select jsonb_agg(
        jsonb_build_object('received_on', received_on, 'cents', cents)
        order by received_on
      )
      from by_day
    ), '[]'::jsonb)
  )
  from cards c cross join period p;
$$;

comment on function public.get_earnings_summary(uuid, date, date, date) is 'Agregação do painel de Ganhos (EARN-03/EARN-04): cards hoje/semana/mês relativos a p_today, total e média do período [p_from, p_to) e série diária ORDENADA por received_on dentro do jsonb_agg (a ordem de uma CTE não sobrevive ao agregado). Filtra voided_at is null (D-21). Buckets por date_trunc sobre received_on, sem conversão de fuso e sem DST. Média = total ÷ (casos distintos + avulsos) com arredondamento único (DV-2/D-17). SECURITY INVOKER + owner-check por auth.uid(). Com zero lançamentos devolve todos os escalares em 0 e by_day = [], nunca null.';

revoke all on function public.get_earnings_summary(uuid, date, date, date) from public;
grant execute on function public.get_earnings_summary(uuid, date, date, date) to authenticated;

-- WR-04: só a coluna de anulação é escrevível pelo dono. A policy de UPDATE
-- (escopo de LINHA, por profile_id) continua exatamente como está; o que muda é
-- o escopo de COLUNA, que a policy não sabe expressar.
revoke update on public.financial_entries from authenticated;
grant update (voided_at) on public.financial_entries to authenticated;

-- `anon` não tem nada a escrever num livro-caixa: toda escrita nasce de uma
-- action autenticada. As policies são todas `to authenticated`, então isto é
-- defesa em profundidade — mas privilégio de escrita que ninguém usa é
-- privilégio a revogar.
revoke insert, update, delete on public.financial_entries from anon;

comment on column public.financial_entries.amount_cents is 'SNAPSHOT do preço em centavos inteiros (D-05/D-14), congelado no ato da gravação. IMUTÁVEL POR PRIVILÉGIO desde 20260821000200: `authenticated` só tem UPDATE em voided_at, então corrigir é anular e relançar (D-19) — não é regra de app, é o banco que recusa.';

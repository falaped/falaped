-- cases.earnings_prompted_at — a pergunta "o que foi cobrado?" acontece UMA VEZ por caso.
--
-- Por que uma coluna nova e não uma derivação:
--   A guarda D-10 conta lançamentos não-anulados (countNonVoidedEntriesForCase). Isso
--   cobre o caso que FATUROU, mas não o que foi dispensado como cortesia (D-09): "Sem
--   cobrança" deixa ZERO lançamento e nenhum vestígio de que já se perguntou. Resultado
--   anterior: reabrir e encerrar o mesmo caso perguntava de novo, e o card "Nenhum
--   lançamento neste atendimento" ficava para sempre na página do caso.
--   Cortesia é indistinguível de "ainda não perguntei" — só um registro explícito separa
--   os dois, e ele não existe em nenhuma outra tabela.
--
-- Semântica: NULL = a pergunta ainda não foi respondida. Timestamp = o médico JÁ decidiu
-- (salvou o lançamento ou clicou "Sem cobrança"), e nada mais pergunta. Marcada ao
-- RESPONDER e não ao ABRIR o modal, de propósito: um Esc acidental não queima o
-- faturamento do atendimento — o card continua oferecendo o caminho de volta.
--
-- Reabrir NÃO limpa a marca: é o mesmo atendimento, e o ciclo reabrir→encerrar era
-- exatamente o que voltava a perguntar.
alter table public.cases
  add column if not exists earnings_prompted_at timestamptz;

comment on column public.cases.earnings_prompted_at is 'Quando o médico RESPONDEU a pergunta do lançamento financeiro deste caso — salvou o lançamento ou dispensou com "Sem cobrança" (cortesia, D-09). NULL = ainda não respondeu. Existe porque a cortesia deixa zero lançamento e é indistinguível de "ainda não perguntei" pela contagem da guarda D-10; sem esta coluna, reabrir e encerrar o mesmo caso perguntava de novo. Reabrir não limpa a marca: é o mesmo atendimento.';

-- Backfill: todo caso JÁ encerrado nasce marcado. Sem isto, os 106 casos encerrados que
-- existem hoje passariam todos a exibir o card de pendência retroativamente. A regra
-- vale dos próximos encerramentos em diante.
-- `coalesce(ended_at, now())`: o instante do encerramento é a melhor aproximação do
-- momento em que a pergunta teria acontecido; casos encerrados sem ended_at (legado do
-- WhatsApp) caem para agora.
update public.cases
set earnings_prompted_at = coalesce(ended_at, now())
where status = 'closed'
  and earnings_prompted_at is null;

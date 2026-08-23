-- financial_entries.case_id: on delete restrict -> on delete cascade.
--
-- REVERTE a D-26 revisada por decisão do produto: excluir um caso passa a excluir os
-- lançamentos daquele caso. O raciocínio é que um lançamento existe em referência a um
-- atendimento — sem o caso, ele não tem a que se referir.
--
-- O que isso CUSTA, registrado aqui porque é irreversível: o faturamento de um caso
-- excluído desaparece do livro-caixa, inclusive de meses já fechados, e some dos totais
-- do painel de Ganhos retroativamente. Não existe trilha de auditoria — o cascade não
-- passa pela anulação (voided_at, D-19), ele APAGA a linha.
--
-- A tabela continua SEM policy de DELETE (D-19): o cascade de FK é uma ação referencial
-- do próprio Postgres e não é submetido a RLS, então apagar o caso apaga os lançamentos
-- sem abrir nenhuma porta de delete manual para o cliente. A única forma de o médico
-- apagar um lançamento continua sendo apagar o caso inteiro.
alter table public.financial_entries
  drop constraint financial_entries_case_id_fkey;

alter table public.financial_entries
  add constraint financial_entries_case_id_fkey
  foreign key (case_id) references public.cases(id) on delete cascade;

comment on table public.financial_entries is 'Livro-caixa de entrada do médico (EARN-01..05). Valores em centavos inteiros; preço e rótulo congelados por snapshot (D-05). case_id nullable = avulso (D-02), sem unique (N linhas por caso, D-08), com on delete CASCADE: excluir o caso exclui os lançamentos dele (decisão de produto que reverte a D-26 revisada; apaga de verdade, sem trilha de auditoria e sem passar pela anulação). Anulação por voided_at, nunca delete (D-19) — tabela sem policy de DELETE, e o cascade é ação referencial do Postgres, fora do alcance da RLS. Buckets do painel pela received_on (dia local da clínica).';

-- Quebra em linhas os lembretes herdados do campo de texto único.
--
-- O que era um textarea virou uma linha só por caso na migration anterior, mas
-- o médico já escrevia um lembrete por LINHA — que é a intenção do registro
-- separado. Cada linha não vazia vira um lembrete.
--
-- Roda uma vez: depois disso nenhum `text` tem quebra de linha, então repetir
-- não muda nada.

insert into public.case_reminders (profile_id, case_id, text, created_at)
select r.profile_id, r.case_id, btrim(line), r.created_at
from public.case_reminders r
cross join lateral unnest(string_to_array(r.text, E'\n')) as line
where r.text like E'%\n%'
  and btrim(line) <> '';

delete from public.case_reminders where text like E'%\n%';

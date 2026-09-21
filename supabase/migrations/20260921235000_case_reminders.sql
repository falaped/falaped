-- Lembretes como REGISTROS SEPARADOS, um por linha (issue #42).
--
-- Substitui a coluna `cases.reminders` (texto único), criada horas antes nesta
-- mesma branch. Lembrete solto num blob não dá para apagar nem marcar
-- individualmente — que é exatamente o que se faz com pendência na consulta
-- seguinte.
--
-- A migração PRESERVA o que já estava escrito: cada `cases.reminders` não vazio
-- vira uma linha antes de a coluna sair. Manter as duas seria manter duas
-- verdades sobre a mesma coisa, com a UI lendo só uma.

create table public.case_reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

comment on table public.case_reminders is
  'Lembretes/pendências do atendimento, um por linha. Consumidos na abertura da próxima consulta do mesmo paciente. Escopo profile_id; cascade no caso.';

create index idx_case_reminders_case_created
  on public.case_reminders (case_id, created_at);

alter table public.case_reminders enable row level security;

create policy "Case reminders select own"
on public.case_reminders for select to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "Case reminders insert own"
on public.case_reminders for insert to authenticated
with check (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "Case reminders delete own"
on public.case_reminders for delete to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

-- Preserva o que já foi escrito no campo antigo. Só casos com profile_id: sem
-- dono não há como escopar a linha nova (nenhum caso do dashboard cai aqui).
insert into public.case_reminders (profile_id, case_id, text, created_at)
select c.profile_id, c.id, btrim(c.reminders), coalesce(c.ended_at, c.started_at, now())
from public.cases c
where c.reminders is not null
  and btrim(c.reminders) <> ''
  and c.profile_id is not null;

alter table public.cases drop column if exists reminders;

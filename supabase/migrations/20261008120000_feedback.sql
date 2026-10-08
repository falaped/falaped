-- Feedback do pediatra (protótipo j1/h8): sugestão, problema ou elogio, enviado
-- pelo item "Enviar feedback" do menu. A equipe lê e acompanha na aba Feedback
-- do admin, que usa o service role (por isso não há policy de admin aqui).
--
-- `page` guarda o caminho de onde veio (/dashboard/cases/…); o rótulo legível
-- ("Consulta") é mapeado no front, para texto nunca virar dado.
-- O médico só envia e lê o que ele mesmo enviou; status muda só pelo admin.
-- Regra D-14: RLS habilitada e todas as policies no MESMO arquivo de migration.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('sugestao', 'problema', 'elogio')),
  message text not null check (char_length(message) between 1 and 4000),
  page text,
  status text not null default 'novo' check (status in ('novo', 'em-analise', 'feito')),
  created_at timestamptz not null default now()
);

comment on table public.feedback is
  'Feedback enviado pelo médico no app (sugestão, problema, elogio). page = caminho de origem; status acompanhado pela equipe no admin.';

create index idx_feedback_created on public.feedback (created_at desc);
create index idx_feedback_profile on public.feedback (profile_id);

alter table public.feedback enable row level security;

create policy "Feedback select own"
on public.feedback for select to authenticated
using (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "Feedback insert own"
on public.feedback for insert to authenticated
with check (
  profile_id in (select id from public.profiles where auth_user_id = auth.uid())
  and status = 'novo'
);

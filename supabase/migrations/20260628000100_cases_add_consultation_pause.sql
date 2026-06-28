alter table public.cases
add column if not exists consultation_paused_ms bigint not null default 0;

alter table public.cases
add column if not exists consultation_paused_at timestamptz;

alter table public.cases
alter column started_at set default now();

comment on column public.cases.consultation_paused_ms is
  'Total acumulado de milissegundos em que a consulta ficou pausada (modelo acumulador).';

comment on column public.cases.consultation_paused_at is
  'Instante em que a consulta foi pausada; não-nulo ⇒ consulta atualmente pausada. NULL ⇒ em andamento.';

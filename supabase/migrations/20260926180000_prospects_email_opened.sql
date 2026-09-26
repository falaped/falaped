-- Webhook da Resend passa a gravar abertura e clique do convite (tracking ligado no domínio).
alter table public.prospects drop constraint prospects_email_status_check;
alter table public.prospects
  add constraint prospects_email_status_check
  check (email_status in ('enviado', 'entregue', 'aberto', 'clicou', 'bounce', 'reclamou'));
comment on column public.prospects.email_status is 'Último evento do convite na Resend: enviado → entregue → aberto → clicou, ou bounce / reclamou.';

-- Datas de abertura e clique para a temperatura do lead (quente ≤14d, morno ≤30d).
alter table public.prospects
  add column opened_at timestamptz,
  add column clicked_at timestamptz;
comment on column public.prospects.opened_at is 'Última abertura de e-mail (webhook da Resend).';
comment on column public.prospects.clicked_at is 'Último clique em link de e-mail (webhook da Resend).';
update public.prospects p set
  opened_at = (select max(created_at) from public.prospect_events e where e.prospect_id = p.id and e.kind in ('aberto', 'clicou')),
  clicked_at = (select max(created_at) from public.prospect_events e where e.prospect_id = p.id and e.kind = 'clicou');

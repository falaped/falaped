-- Anexos que nascem juntos (relatório de exames + exame lido) formam um GRUPO
-- e aparecem num card só na lista de anexos. Upload avulso continua sem grupo.
-- `group_role` diz o papel de cada arquivo dentro do grupo.

alter table public.patient_attachments
  add column group_id uuid,
  add column group_role text check (group_role in ('report', 'exam'));

comment on column public.patient_attachments.group_id is
  'Anexos gerados juntos pela leitura de exames compartilham o id; null = anexo avulso.';

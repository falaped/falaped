-- Nome dado pelo médico ao anexo (issue #40).
-- Opcional: sem título, a ficha mostra o nome original do arquivo. O nome
-- original NUNCA é substituído — continua em `file_name`, que é o que garante a
-- extensão certa no download.

alter table public.patient_attachments
  add column if not exists title text;

comment on column public.patient_attachments.title is
  'Nome dado pelo médico ao anexo (ex.: "Hemograma de março"). Null = exibir file_name. O nome original do arquivo fica sempre em file_name.';

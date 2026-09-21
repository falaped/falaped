-- Lembretes da consulta e mini resumo para a próxima (issue #42).
--
-- `reminders`: o que o médico anota DURANTE o atendimento para lembrar na
-- próxima vez (pendências, reavaliações, exames a pedir). Texto livre.
--
-- `summary`: resumo curto gerado ao FECHAR a consulta, a partir do relatório, da
-- conversa e dos lembretes. Gerado uma vez e guardado — não é recalculado a cada
-- leitura, senão abrir a ficha custaria uma chamada de IA.
--
-- `summary_generated_at` existe para distinguir "ainda não gerou" de "gerou e
-- não saiu nada": sem ele, toda consulta fechada antes desta feature pareceria
-- uma geração pendente para sempre.

alter table public.cases
  add column if not exists reminders text,
  add column if not exists summary text,
  add column if not exists summary_generated_at timestamptz;

comment on column public.cases.reminders is
  'Lembretes e pendências anotados pelo médico durante o atendimento. Texto livre; alimenta o resumo da próxima consulta.';
comment on column public.cases.summary is
  'Mini resumo do atendimento, gerado por IA ao fechar a consulta e exibido ao abrir a próxima do mesmo paciente.';
comment on column public.cases.summary_generated_at is
  'Quando o resumo foi gerado. Null = nunca tentou (caso antigo ou geração falhou).';

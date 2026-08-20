-- Motivo e tipo da consulta (260724-jka). Enriquece public.appointments com
-- `reason` (motivo, opcional) e `type` (tipo da consulta, obrigatório) para o
-- detalhe legível na agenda e a classificação no ato do agendamento.
--
-- Segue o padrão da migration 20260722200000_appointments: comments em PT-BR,
-- enum com valores em inglês (rótulos PT-BR vivem na UI). NÃO toca em
-- RLS/policies/constraints/exclusion existentes.

-- Enum do tipo de consulta. Valores em inglês (mesma convenção do
-- appointment_status); os rótulos PT-BR vivem na UI (APPOINTMENT_TYPE_LABEL).
create type public.appointment_type as enum (
  'puericultura',       -- acompanhamento do crescimento/desenvolvimento
  'urgencia',           -- atendimento de urgência
  'retorno',            -- retorno / reavaliação
  'primeira_consulta'   -- primeira consulta do paciente
);

comment on type public.appointment_type is
  'Tipo da consulta (260724-jka): puericultura | urgencia | retorno | primeira_consulta. Valores em inglês; rótulos PT-BR vivem na UI (APPOINTMENT_TYPE_LABEL).';

-- Motivo (opcional): texto livre com o contexto da consulta (ex.: "febre há 2 dias").
alter table public.appointments add column reason text;

comment on column public.appointments.reason is
  'Motivo da consulta (opcional, 260724-jka): texto livre com o contexto informado no agendamento.';

-- Tipo (obrigatório): adicionado com DEFAULT seguro para backfilar as linhas
-- legadas num único passo, sem janela nula. O default só existe para preencher
-- linhas pré-existentes — a UI SEMPRE envia o tipo escolhido no agendamento.
alter table public.appointments
  add column type public.appointment_type not null default 'puericultura';

comment on column public.appointments.type is
  'Tipo da consulta (obrigatório, 260724-jka). O DEFAULT ''puericultura'' só existe para backfilar linhas legadas nesta migration; a UI sempre envia o tipo escolhido no agendamento.';

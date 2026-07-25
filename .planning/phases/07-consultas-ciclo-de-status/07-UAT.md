---
status: testing
phase: 07-consultas-ciclo-de-status
source: [07-VERIFICATION.md]
started: 2026-07-25T00:00:00Z
updated: 2026-07-25T00:00:00Z
---

## Current Test

number: 1
name: Migration appointments aplicada no Supabase live (enum + tabela + RLS + btree_gist + exclusion constraint parcial)
expected: |
  `select conname, pg_get_constraintdef(oid) from pg_constraint where conname='appointments_no_double_booking'`
  retorna `EXCLUDE USING gist (...) WHERE status in ('pending','confirmed')`; o enum de status tem
  exatamente {pending, confirmed, done, no_show, canceled}; existem 4 policies RLS na tabela appointments;
  btree_gist presente em pg_extension; patient_id ON DELETE RESTRICT.
awaiting: user response

## Tests

### 1. Migration appointments aplicada no Supabase live
expected: A migration 20260722200000_appointments.sql está de fato aplicada no banco live — exclusion constraint `appointments_no_double_booking` com predicado parcial pending+confirmed, enum de 5 valores, tabela appointments com 4 policies RLS, extensão btree_gist, patient_id ON DELETE RESTRICT. (O SQL está correto no arquivo; build/typecheck passam SEM a migration aplicada — falso-positivo conhecido, checkpoint [BLOCKING] do 07-01 Task 3.)
result: [pending]

### 2. Smoke de double-booking (23P01 → copy amigável)
expected: Provocar duas consultas pending/confirmed sobrepostas para o mesmo profile_id — a segunda falha com SQLSTATE 23P01 e, via createAppointmentAction, a UI mostra "Este horário já foi ocupado por outra consulta. Escolha outro horário livre." — nunca o erro cru 23P01.
result: [pending]

### 3. Distinção visual dos 5 status na grade viva (tamanho de célula real)
expected: Na grade live (calendar-time-grid.tsx), em tamanho de célula real, as distinções são inconfundíveis a olho — SC-2: falta (UserX) ≠ cancelada (hachura + nome riscado); SC-3: pendente (borda tracejada/menta) ≠ confirmada (sólida); realizada em tom muted.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

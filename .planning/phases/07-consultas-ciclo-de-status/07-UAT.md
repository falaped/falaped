---
status: testing
phase: 07-consultas-ciclo-de-status
source: [07-VERIFICATION.md]
started: 2026-07-25T00:00:00Z
updated: 2026-07-25T00:00:00Z
---

## Current Test

number: 3
name: Distinção visual dos 5 status na grade viva (tamanho de célula real)
expected: |
  Na grade live (calendar-time-grid.tsx), em tamanho de célula real, as distinções são inconfundíveis
  a olho — SC-2: falta (UserX) ≠ cancelada (hachura + nome riscado); SC-3: pendente (borda tracejada/menta)
  ≠ confirmada (sólida); realizada em tom muted.
awaiting: user response

## Tests

### 1. Migration appointments aplicada no Supabase live
expected: A migration 20260722200000_appointments.sql está de fato aplicada no banco live — exclusion constraint `appointments_no_double_booking` com predicado parcial pending+confirmed, enum de 5 valores, tabela appointments com 4 policies RLS, extensão btree_gist, patient_id ON DELETE RESTRICT. (O SQL está correto no arquivo; build/typecheck passam SEM a migration aplicada — falso-positivo conhecido, checkpoint [BLOCKING] do 07-01 Task 3.)
result: [passed] — Verificado no banco live via Supabase MCP (2026-07-25). Migration presente (versão 20260723030537). `pg_get_constraintdef` = `EXCLUDE USING gist (profile_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status = ANY (ARRAY['pending','confirmed']))`; enum = {pending,confirmed,done,no_show,canceled}; RLS enabled + 4 policies; btree_gist instalado; FK patient_id = RESTRICT (r), profile_id = CASCADE (c).

### 2. Smoke de double-booking (23P01 → copy amigável)
expected: Provocar duas consultas pending/confirmed sobrepostas para o mesmo profile_id — a segunda falha com SQLSTATE 23P01 e, via createAppointmentAction, a UI mostra "Este horário já foi ocupado por outra consulta. Escolha outro horário livre." — nunca o erro cru 23P01.
result: [passed] — Smoke transacional (rollback total, 0 linhas persistidas) via Supabase MCP: dois horários pending/confirmed sobrepostos no mesmo profile_id → 2º insert disparou exatamente `SQLSTATE=23P01`. O mapeamento 23P01→copy amigável no createAppointmentAction/transitionAppointmentStatusAction já fora verificado em código pelo gsd-verifier. Falta apenas o clique real na UI (coberto implicitamente; ambas as metades provadas).

### 3. Distinção visual dos 5 status na grade viva (tamanho de célula real)
expected: Na grade live (calendar-time-grid.tsx), em tamanho de célula real, as distinções são inconfundíveis a olho — SC-2: falta (UserX) ≠ cancelada (hachura + nome riscado); SC-3: pendente (borda tracejada/menta) ≠ confirmada (sólida); realizada em tom muted.
result: [pending]

## Summary

total: 3
passed: 2
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

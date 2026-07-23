---
phase: 07-consultas-ciclo-de-status
plan: 02
subsystem: appointments
tags: [modules, actions, result-union, exclusion-constraint, 23P01, slot-validation, compare-and-set]
status: complete
requires:
  - 07-01 (live appointments schema + partial GiST exclusion constraint + isLegalTransition + Zod schemas)
  - Phase 6 expandAvailability / CLINIC_TIME_ZONE / availability modules (slot-free check)
  - public.patients (patient_id FK), getAuthenticatedUser + paid gate
provides:
  - createAppointment module (profile_id stamped server-side, preserves error.code 23P01)
  - listAppointmentsByProfileId module (windowed [from,to), owner-scoped, all statuses)
  - updateAppointmentStatus module (compare-and-set + double .eq IDOR guard, preserves error.code)
  - createAppointmentAction (born Confirmada D-05, slot-free check, 23P01→friendly result union)
  - transitionAppointmentStatusAction (legal-transition guard + compare-and-set miss handling)
  - actions/appointments barrel + root actions/index.ts re-export
affects:
  - 07-03 (UI wires the create dialog + status actions onto the calendar)
  - Phase 9 (assistant creates pending requests over this action/constraint contract)
tech-stack:
  added: []
  patterns:
    - "Greenfield error.code preservation: module rethrows Error with .code assigned so the action branches on SQLSTATE 23P01 (deviates from repo bare error.message)"
    - "Compare-and-set status UPDATE (.eq('status', from)) as concurrency guard; 0-rows → matched:false result (not an error)"
    - "Layered double-booking defense: app slot-free check (UX/TOCTOU) + DB exclusion constraint (authoritative)"
key-files:
  created:
    - modules/appointments/create-appointment.ts
    - modules/appointments/list-appointments-by-profile-id.ts
    - modules/appointments/update-appointment-status.ts
    - actions/appointments/create-appointment.ts
    - actions/appointments/update-appointment-status.ts
    - actions/appointments/index.ts
  modified:
    - actions/index.ts
decisions:
  - "createAppointmentAction stamps status 'confirmed' (D-05: doctor creates Confirmada); default 'pending' stays DB-side for the assistant (Phase 9)"
  - "Slot-free check maps snake_case rows → camelCase (AvailabilityBand/AvailabilityOverride) VERBATIM per app/dashboard/agenda/page.tsx before expandAvailability (WARNING 1: raw rows → undefined minutes → zero slots → check always fails)"
  - "23P01 caught in BOTH actions (Pitfall 4: confirming a pending can collide on UPDATE); create uses 'já ocupado' copy, transition uses 'já ocupado' on 23P01 and 'atualizar o pedido' on compare-and-set miss"
  - "TOCTOU between slot-free check and INSERT accepted — the DB exclusion constraint is the final arbiter (D-08)"
metrics:
  duration: ~3 min
  completed: 2026-07-23
  tasks: 2
  files: 7
---

# Phase 7 Plan 02: Appointments Data + Action Layers Summary

Built the appointments data + action layers on top of the live Plan 01 schema: three owner-scoped modules (create with 23P01 error.code preservation, windowed list, compare-and-set status update) and two server actions (createAppointmentAction born Confirmada with a server-side slot-free check and 23P01→friendly mapping; transitionAppointmentStatusAction with legal-transition enforcement and compare-and-set miss handling), plus the action barrels wired into the repo registry.

## What Was Built

**Task 1 — Modules (commit 302b70b):**
- `modules/appointments/create-appointment.ts` — `createAppointment(supabase, profileId, input)`: INSERT with `profile_id` stamped server-side (never from client), `.select(...).single()`. CRITICAL DEVIATION (Pitfall 3): on error it builds a new Error and assigns `(e as { code?: string }).code = error.code` before throwing, so the action can branch on SQLSTATE `23P01` instead of fragile message-substring matching.
- `modules/appointments/list-appointments-by-profile-id.ts` — `listAppointmentsByProfileId(supabase, profileId, from, to)`: owner-scoped select, half-open window `.gte("starts_at", from).lt("starts_at", to)`, `.order("starts_at")`. Returns all statuses (historical done/no_show/canceled stay visible, D-07).
- `modules/appointments/update-appointment-status.ts` — `updateAppointmentStatus(supabase, profileId, id, from, to)`: compare-and-set UPDATE double-scoped `.eq("profile_id").eq("id")` (IDOR backstop) + `.eq("status", from)` (concurrency guard). Distinguishes 0-rows (`matched: false`, via `.maybeSingle()`) from a thrown DB error; preserves `error.code` (23P01 can fire on pending→confirmed, Pitfall 4).

**Task 2 — Actions + barrels (commit 2a8331c):**
- `actions/appointments/create-appointment.ts` — `createAppointmentAction`: auth + paid gate, Zod `createAppointmentSchema` safeParse, server-side slot-free check (loads rules+overrides, maps snake→camel VERBATIM per page.tsx, derives the local-date day window in `CLINIC_TIME_ZONE` via `startOfDay`/`addDays(...,1)`, calls `expandAvailability`, confirms a FreeSlot with matching `start`/`end`; else the "não está mais disponível" copy). Creates born `status: "confirmed"` (D-05). Catches `23P01` → "Este horário já foi ocupado por outra consulta. Escolha outro horário livre."; other errors → generic. `revalidatePath("/dashboard/agenda")`.
- `actions/appointments/update-appointment-status.ts` — `transitionAppointmentStatusAction`: auth + paid gate, Zod `updateAppointmentStatusSchema`, `isLegalTransition(from, to)` guard (illegal → generic copy). Delegates to `updateAppointmentStatus`; compare-and-set miss (`matched: false`) → "Não foi possível atualizar o pedido. Tente novamente."; catches 23P01 (Pitfall 4) → "já ocupado" copy; other errors → "Não foi possível atualizar a consulta." `revalidatePath("/dashboard/agenda")`. File keeps the `update-appointment-status.ts` name but exports `transitionAppointmentStatusAction` (v7 scope).
- Barrels: `actions/appointments/index.ts` re-exports both actions + result types; root `actions/index.ts` gains a `from "./appointments"` block.

## Verification

- `yarn typecheck` → clean.
- `yarn test` → 547 pass, 0 fail (unchanged — this plan added no test files; the transition machine tests from Plan 01 still pass).
- `npx eslint` on all 6 new appointment files + modified `actions/index.ts` → 0 errors (repo-wide lint has 1491 pre-existing errors, all inside `ds-bundle/` — out of scope, not touched).
- Grep acceptance criteria all satisfied:
  - `[APPOINTMENTS]` tag in all three modules; `code = error.code` in create + update modules.
  - update module has `.eq("profile_id")` + `.eq("id")` + `.eq("status")`; list has `.gte/.lt/.order("starts_at")`.
  - create action stamps `"confirmed"`, contains `expandAvailability`, `startMinute` mapping (WARNING 1), and both the "já foi ocupado" + "não está mais disponível" copy verbatim.
  - transition action calls `isLegalTransition` and handles the compare-and-set miss with the "atualizar o pedido" copy.
  - both actions call `getAuthenticatedUser`, gate `profile.status !== "paid"`, and `revalidatePath("/dashboard/agenda")`.
  - barrels export both action names; root `actions/index.ts` re-exports from `"./appointments"`.
- No module imports `next/cache` / `next/headers` or constructs a Supabase client.

## Deviations from Plan

None as in-flight deviations. The one intentional divergence from the repo's standard pattern — modules preserving `error.code` instead of throwing a bare `error.message` — was a pinned requirement of the plan itself (Pitfall 3 / Pattern 4, key_links), not a discovered deviation.

Implementation note (within plan latitude): the update-status module uses `.maybeSingle()` (not `.single()`) so a 0-row compare-and-set miss returns `data: null` cleanly rather than surfacing a "no rows" PostgrestError — this is exactly the "distinguish 0-rows-affected from a thrown error" behavior the plan required.

## Requirements Progress

- **APPT-01** (create) — `createAppointmentAction` creates a Confirmada appointment linked to an existing patient in a server-validated free slot.
- **APPT-02 / APPT-03** (cycle / confirm-reject) — `transitionAppointmentStatusAction` enforces the legal cycle via `isLegalTransition`; final states are read-only; recusar = pending→canceled, cancelar = confirmed→canceled.
- **APPT-04** (action side) — a double-booking attempt returns the friendly "horário já ocupado" result union, never a raw 23P01.

## For the Next Plan (07-03)

- Wire the create dialog on a free-slot click (D-03) calling `createAppointmentAction`; reuse the `patients` domain for selection (D-04).
- Render appointments over the calendar slots by status (pending/confirmed/no_show/canceled distinct); surface the "lista de pedidos a confirmar".
- Load appointments for the visible window via `listAppointmentsByProfileId` in the agenda RSC and pass them to the client editor.
- Wire status actions (confirmar/recusar/realizada/falta/cancelar) to `transitionAppointmentStatusAction`; on the "já ocupado" / "não está mais disponível" / "atualizar o pedido" result unions show the inline error copy (UI-SPEC).

## Self-Check: PASSED

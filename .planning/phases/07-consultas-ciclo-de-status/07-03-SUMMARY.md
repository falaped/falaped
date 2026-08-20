---
phase: 07-consultas-ciclo-de-status
plan: 03
subsystem: ui
tags: [react, nextjs, rsc, shadcn, appointments, calendar, tiptap-none, sonner, dnd-none]

# Dependency graph
requires:
  - phase: 07-01
    provides: appointment_status enum, appointments table + RLS, isLegalTransition state machine, Zod schemas
  - phase: 07-02
    provides: createAppointmentAction, listAppointmentsByProfileId, transitionAppointmentStatusAction (result unions, 23P01 preservation)
  - phase: 06
    provides: editable calendar (calendar-editor/calendar-day-week-grid), expandAvailability, CLINIC_TIME_ZONE
provides:
  - Doctor-facing appointment UI on the Phase 6 calendar (creation dialog, 5-status rendering, pending panel, transition menu)
  - appointment-create-dialog (patient search via patients domain, born Confirmada, inline double-booking error, duration selector)
  - pending-requests-panel (Confirmar/Recusar wired to transitionAppointmentStatusAction, destructive AlertDialog)
  - appointment-detail-menu (legal-only transitions, final-state read-only)
  - RSC parallel load of appointments alongside availability + patients
affects: [phase-09-assistant-scheduling-ui, agenda-hibrida-redesign, phase-10-earnings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Appointment overlay layered onto the Phase 6 grid via the existing cell callback seam (no gesture-logic changes)"
    - "starts_at (UTC) → clinic-zone cell mapping; active booking (pending/confirmed) takes visual precedence over historical (D-07)"
    - "Multi-cell appointment blocks: span every 30-min cell in [starts_at, ends_at), paint icon/name only on the first covered cell"
    - "Transition actions fire from a snapshotted closure so a closing Popover cannot unmount the flow mid-commit"

key-files:
  created:
    - components/dashboard/agenda/appointment-create-dialog.tsx
    - components/dashboard/agenda/pending-requests-panel.tsx
    - components/dashboard/agenda/appointment-detail-menu.tsx
  modified:
    - components/dashboard/agenda/calendar-day-week-grid.tsx
    - components/dashboard/agenda/calendar-editor.tsx
    - app/dashboard/agenda/page.tsx
    - actions/appointments/create-appointment.ts

key-decisions:
  - "Reversed D-01 (single-slot booking): added a Duração selector (15/30/45/60/90) so a consulta can span multiple 30-min cells; the create action now validates the entire [starts_at, ends_at) range is covered by contiguous free slots"
  - "Added appointment-detail-menu.tsx (not in the plan's file list) to host the confirmed-cell transition menu + final-state read-only detail cleanly, separate from the grid"
  - "Re-bookable final/canceled future slots: a slot whose only appointment is canceled/done/no_show and that is free + future opens Nova consulta; past/out-of-availability final stays read-only"
  - "Future-only booking gate (isCellBookable): only slots starting after clinic-zone now are bookable; create action re-validates starts_at > now (defense-in-depth)"

patterns-established:
  - "Snapshot-on-initiate for transition flows: capture id/from-status/labels into local state before opening the confirm dialog, immune to parent nulling the detail prop"
  - "Detail menu opens on ANY cell a multi-cell appointment covers (start snapped down, end snapped up to STEP)"

requirements-completed: [APPT-01, APPT-02, APPT-03]

coverage:
  - id: D1
    description: "Creation dialog: click a free/future slot → Nova consulta dialog, patient search over profile patients, duration selector, born Confirmada, inline friendly double-booking error"
    requirement: APPT-01
    verification:
      - kind: manual_procedural
        ref: "07-03-PLAN Task 3 how-to-verify steps 2-3 (create + double-booking)"
        status: pass
    human_judgment: true
    rationale: "Free-slot creation flow and the friendly double-booking message require human eyes; validated during the interactive session (commits fe7ed54, 6f10487, 9c36a57)"
  - id: D2
    description: "5-status calendar rendering (pendente dashed/light, confirmada solid fill, realizada muted, falta destructive+UserX, cancelada hatch+strikethrough) with a confirmed-cell transition menu offering only legal transitions; final states read-only"
    requirement: APPT-02
    verification:
      - kind: manual_procedural
        ref: "07-03-PLAN Task 3 how-to-verify steps 4-5,7 (falta≠cancelada, pendente≠confirmada, final read-only)"
        status: pass
    human_judgment: true
    rationale: "Visual distinctions (SC-2/SC-3) at 24px cell size require human verification"
  - id: D3
    description: "Pedidos a confirmar panel: pending requests with Confirmar (pending→confirmed) and Recusar (destructive AlertDialog, pending→canceled) wired to transitionAppointmentStatusAction; dashed empty state"
    requirement: APPT-03
    verification:
      - kind: manual_procedural
        ref: "07-03-PLAN Task 3 how-to-verify step 6 (pending panel confirm/reject)"
        status: pass
    human_judgment: true
    rationale: "Confirm/reject round-trip and grid reflection require human verification"
  - id: D4
    description: "RSC parallel load — listAppointmentsByProfileId + getPatientsByProfileId added to the agenda page Promise.all, rows enriched and passed to CalendarEditor; load-error copy"
    verification:
      - kind: automated
        ref: "yarn typecheck (clean); grep listAppointmentsByProfileId app/dashboard/agenda/page.tsx"
        status: pass
    human_judgment: false

# Metrics
duration: ~8h30m (interactive session, wall-clock incl. iteration)
completed: 2026-07-23
status: complete
---

# Phase 07, Plan 03: Appointment UI on the editable calendar — Summary

**The doctor can now book, see, and drive appointments through their full status cycle directly on the Phase 6 calendar — click a free slot to open Nova consulta, watch the 5 statuses render distinctly, and confirm/reject requests from the Pedidos a confirmar panel.**

> **Retroactive close-out (2026-07-24).** This SUMMARY was written after the fact via the `/gsd-execute-phase` safe-resume gate: the plan's work was fully implemented and committed across 6 commits on 2026-07-23 (`fe7ed54` → `9c36a57`) but no SUMMARY.md had been written, so GSD still counted the plan as incomplete. No code was re-executed — this document reconciles the record with what was already shipped and verified during the original interactive session. The status rendering has since been refactored by the later "agenda híbrida" redesign into a shared `appointment-status-style.ts` (consumed by the grid and detail menu); the 07-03 deliverables and behavior remain intact.

## Performance

- **Duration:** interactive session (6 commits, 2026-07-23 00:19 → 08:47 -0300)
- **Tasks:** 2 auto tasks + 1 blocking human-verify checkpoint (all completed)
- **Files created:** 3 · **Files modified:** 4

## Accomplishments
- Creation dialog: click a free/future slot → centered `Dialog` with locked slot data, patient search delegated to the patients domain (no patient creation, D-04), a duration selector, born-Confirmada on success (D-05), and an inline friendly double-booking message (never a raw 23P01).
- 5-status grid rendering with icon+fill+border triples; falta (destructive + UserX) unmistakably distinct from cancelada (hatch + strikethrough), pendente (dashed/light) distinct from confirmada (solid fill). Active bookings take visual precedence over historical (D-07).
- Pedidos a confirmar panel: Confirmar / Recusar wired to `transitionAppointmentStatusAction`, destructive AlertDialog on Recusar, dashed empty state.
- Confirmed-cell transition menu (`appointment-detail-menu.tsx`) offering only legal transitions; final states are read-only.
- RSC loads appointments + patients alongside availability in one `Promise.all`; typecheck + build clean, oklch tokens only across all new/modified agenda components.

## Task Commits

1. **Task 1: Creation dialog + pending-requests panel** — `fe7ed54` (feat)
2. **Task 2: 5-status rendering + transition menu + RSC parallel load** — `0722676` (feat)
3. **Task 2 follow-ups (fixes/enhancements during the session):**
   - `d704c44` (fix) — open detail menu on any cell a multi-cell appointment covers
   - `6f10487` (feat) — duration selector on booking (reverses D-01)
   - `250dab8` (fix) — snapshot transition state so a closing Popover can't unmount the cancel flow
   - `9c36a57` (feat) — re-bookable canceled/final future slots + future-only booking gate
4. **Task 3 [BLOCKING] human-verify** — no code; approved during the session (see Deviations for the D-01 reversal surfaced there)

## Files Created/Modified
- `components/dashboard/agenda/appointment-create-dialog.tsx` — Nova consulta dialog (patient search, duration, inline double-booking error)
- `components/dashboard/agenda/pending-requests-panel.tsx` — Pedidos a confirmar (Confirmar/Recusar)
- `components/dashboard/agenda/appointment-detail-menu.tsx` — confirmed-cell transition menu + final-state read-only detail (added; not in plan file list)
- `components/dashboard/agenda/calendar-day-week-grid.tsx` — appointment overlay, 5-status rendering, free-slot click routing, multi-cell blocks
- `components/dashboard/agenda/calendar-editor.tsx` — `appointments`/`patients` props, cell-status mapping, hosts dialog + pending panel
- `app/dashboard/agenda/page.tsx` — parallel load of appointments + patients, enriched rows, load-error copy
- `actions/appointments/create-appointment.ts` — range validation for multi-slot bookings + `starts_at > now` re-check

## Decisions Made
- **Reversed D-01 (single-slot booking).** Surfaced at the blocking checkpoint: a consulta needs a real duration. Added a Duração selector (15/30/45/60/90, default = clicked band `slot_minutes`); `ends_at = starts_at + duration`; the create action validates the full range is covered by contiguous free slots. The DB exclusion constraint remains the authoritative overlap defense.
- **Added `appointment-detail-menu.tsx`** (beyond the plan's declared files) to isolate the transition/detail popover from the grid.
- **Re-bookable final/canceled future slots** and a **future-only booking gate** (`isCellBookable` + action-side `starts_at > now`) — natural consequences of the status cycle not anticipated in the plan.

## Deviations from Plan
- **D-01 reversed** (single 30-min slot → chosen duration). Rationale above; agreed at the human-verify checkpoint.
- **Extra file:** `appointment-detail-menu.tsx` created (plan listed 5 files; shipped 3 created + 4 modified, incl. the create action).
- **Extra hardening:** popover-close resilience for transitions, future-only booking, re-bookable final slots — all additive, none contradict the plan's success criteria.

## Verification
- `yarn typecheck` — clean (re-confirmed at close-out 2026-07-24).
- Token-only check (`#hex`/`rgb(`) — 0 hits across the new/modified agenda components.
- Wiring greps — `transitionAppointmentStatusAction` (panel + detail menu), patient-domain search (dialog), `listAppointmentsByProfileId` (page) all present.
- [BLOCKING] visual checkpoint (SC-1..4, falta≠cancelada, pendente≠confirmada, pending panel, final read-only) — approved during the original interactive session.

---
phase: 01-experi-ncia-da-consulta
plan: 05
subsystem: cases/ui
tags: [consultation-timer, dnd-kit, pause-resume, reset, floating-widget, persisted-timestamp]

# Dependency graph
requires:
  - phase: 01-01
    provides: cases.started_at default + consultation_paused_ms/at columns (live)
provides:
  - "lib/compute-elapsed-ms.ts — pure timestamp-derived elapsed (end ?? now − started − pausedMs − live pause)"
  - "hooks/use-consultation-timer.ts — repaint-only tick (setInterval never increments)"
  - "modules/cases/{pause,resume,reset}-consultation.ts + actions — ownership-scoped (user_phone), gated"
  - "components/dashboard/cases/consultation-timer-widget.tsx — floating draggable widget (running/paused states, reset)"
affects: [Phase 5 (elapsed/timer model is reference for consultation analytics, AI-02 deferred)]

# Tech tracking
tech-stack:
  added: []  # @dnd-kit already installed
  patterns:
    - "Elapsed computed from persisted timestamps every render; setInterval only forces repaint while running (drift-free, reload-safe)"
    - "cases timer writes scoped by user_phone (resolved from profile_id), mirroring update-case-status"
    - "Timer-state actions revalidate BOTH /dashboard/cases/:id and /dashboard/cases/new/:id (workspace route is cached via cacheComponents)"

key-files:
  created:
    - lib/compute-elapsed-ms.ts
    - lib/compute-elapsed-ms.spec.ts
    - hooks/use-consultation-timer.ts
    - components/dashboard/cases/consultation-timer-widget.tsx
    - modules/cases/pause-consultation.ts
    - modules/cases/resume-consultation.ts
    - modules/cases/reset-consultation.ts
    - actions/cases/pause-consultation.ts
    - actions/cases/resume-consultation.ts
    - actions/cases/reset-consultation.ts
  modified:
    - modules/cases/types.ts
    - modules/cases/get-case-by-id.ts
    - modules/cases/update-case-status.ts
    - actions/cases/index.ts
    - actions/index.ts
    - components/dashboard/cases/case-detail-content.tsx
    - components/dashboard/cases/new-case-workspace.tsx
    - app/dashboard/cases/new/[caseId]/page.tsx

key-decisions:
  - "Pause uses an accumulator model: consultation_paused_at marks the live pause; on resume the gap is folded into consultation_paused_ms. Elapsed subtracts both the accumulator and any live pause."
  - "Reopening a closed case (updateCaseStatus → active) resets the timer: started_at=now, paused_ms=0, paused_at=null — a reopened case is a fresh consultation."
  - "Reset option added (modules/actions/reset-consultation + widget button w/ confirm dialog) to zero the timer without closing the case."
  - "Widget shown on BOTH /dashboard/cases/:id and /dashboard/cases/new/:id; auto-hides (returns null) once the case is ended."
  - "Timer-state actions revalidate the workspace route to avoid a stale/frozen cached timer after reopen (cacheComponents)."
  - "'Sair do workspace' (with messages) returns to the case detail /dashboard/cases/:id."

patterns-established:
  - "Floating draggable widget via @dnd-kit with localStorage position + viewport clamp"
  - "Drift-free timer: persisted-timestamp compute + repaint-only interval"

requirements-completed: [CONS-02, CONS-03]

# Metrics
duration: ~30min (incl. UX iteration)
completed: 2026-06-28
---

# Phase 1 Plan 05: Consultation Timer Slice Summary

**A floating, draggable consultation timer: a pure timestamp-derived elapsed helper + repaint-only hook (reload/navigation safe), ownership-scoped pause/resume/reset actions over the live `cases` pause columns, and a polished widget shown on both the case detail and the new-case workspace that auto-hides when the case ends.**

## Performance

- **Duration:** ~30 min (3 planned tasks + iterative UX refinement from review)
- **Tasks:** 4 (RED + 3 impl; Task 4 = human-verify checkpoint, approved after UX iteration)
- **Files created:** 10 · **modified:** 8

## Accomplishments

- **Elapsed engine (`lib/compute-elapsed-ms.ts`):** `(endedAt ?? now) − startedAt − consultation_paused_ms − (live pause if paused)`, clamped non-negative. Pure + co-located spec.
- **Hook (`hooks/use-consultation-timer.ts`):** recomputes from timestamps every render; `setInterval` only forces a 1s repaint while running — never an incrementing counter, so reload/navigation never resets (CONS-03).
- **Pause/resume/reset slices:** `modules/cases/{pause,resume,reset}-consultation.ts` + matching `actions/` — all gated (`getAuthenticatedUser` + `profile.status === "paid"`), scoped by `user_phone`, exported through both barrels. Reset re-anchors `started_at` and clears pause.
- **Widget (`consultation-timer-widget.tsx`):** floating card (rounded, `bg-card/95`, shadow), `font-mono tabular-nums` elapsed, state row (running pinging dot / paused), `@dnd-kit` drag with `localStorage` position + viewport clamp, pause/resume button, reset button with confirm dialog. Auto-hides when `ended_at` is set.
- **Auto-start (CONS-02):** anchored on `cases.started_at` (set on case open by Plan 01-01); no "Iniciar" button.
- **Mounted on both surfaces:** case detail (`/dashboard/cases/:id`) and workspace (`/dashboard/cases/new/:id`).

## Task Commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 (RED) | Failing computeElapsedMs spec | 7a7c072 |
| 1 | computeElapsedMs + case timer fields on type/select | edaf544 |
| 2 | Pause/resume slice (modules + actions + both barrels) | e41a296 |
| 3 | Timer hook + draggable widget + case-detail mount | 8a79554 |
| review | Redesign widget, mount in workspace, reset timer on reopen | 8b98151 |
| review | Reset option, hide widget when ended, remove from detail (later restored) | e4b253d |
| review | Revalidate workspace route on status/timer change (stale-timer fix) | 167682f |
| review | Show timer on detail too; "Sair do workspace" → case detail | 656583c |

## Deviations from Plan (review-driven UX iteration)

All approved by the user during the human-verify checkpoint:
1. **Widget redesign** — original styling rejected as "muito ruim"; rebuilt as a polished floating card.
2. **Reopen resets the timer** — reopening a closed case starts a fresh consultation (DB reset in `update-case-status`).
3. **Reset option** — added a new reset-consultation slice + confirm dialog.
4. **Hide when ended** — widget returns null once the case is closed.
5. **Dual-surface** — shown on both case detail and workspace (the detail mount was briefly removed then restored per final requirement).
6. **Stale-timer fix** — timer-state actions revalidate the cached workspace route.
7. **Exit nav** — "Sair do workspace" returns to `/dashboard/cases/:id`.

## Verification

- `yarn typecheck` → 0 errors · `yarn lint` → 0 errors (4 pre-existing unrelated warnings) · `yarn test` → 395/395 pass.
- Pause/resume/reset actions present in both `actions/cases/index.ts` and the curated `actions/index.ts` barrel (no `@/actions` resolution gap).
- Human-verify checkpoint (Task 4): approved.

## Known Stubs

None for the timer. Consultation-time analytics (AI-02) is deferred to a later milestone per CONTEXT.

## Self-Check: PASSED

- FOUND: lib/compute-elapsed-ms.ts, hooks/use-consultation-timer.ts, components/dashboard/cases/consultation-timer-widget.tsx
- FOUND: modules/cases/{pause,resume,reset}-consultation.ts + matching actions
- pause/resume/reset exported from actions/index.ts
- FOUND commits: 7a7c072, edaf544, e41a296, 8a79554, 8b98151, e4b253d, 167682f, 656583c

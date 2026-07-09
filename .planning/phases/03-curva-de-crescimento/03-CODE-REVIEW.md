---
phase: 03-curva-de-crescimento
kind: code-review
reviewed_at: 2026-07-09
level: high
scope: "diff origin/main...phase-03-curva-de-crescimento (PR #3)"
status: findings-open (user deferred fixes 2026-07-09)
reported: 10
refuted: 4
---

# Code Review — Phase 03 (PR #3)

High-effort workflow review (24 agents, 21 candidates, independent verify pass,
4 refuted). **Fixes deferred by user on 2026-07-09** — PR #3 shipped as-is; act on these later.

## Correctness bugs

### 1. [HIGH] Cross-tenant write — `patient_id` ownership never verified on create/update — CONFIRMED
`actions/patient-growth/create-measurement.ts:43` (root cause also `supabase/migrations/20260709000000_patient_measurements.sql:58`; same gap in `update-measurement` action).
The action passes the client-supplied `patientId` straight to the insert; RLS INSERT `WITH CHECK` validates only `profile_id`. A paid doctor A can attach a measurement to doctor B's `patient_id`. Ownership specs only covered the query `.eq` filters (read/update/delete), never that the *inserted* `patient_id` belongs to the caller.
**Fix:** in the action, verify the patient belongs to `profile.id` before insert (e.g. `getPatientById(supabase, profile.id, patientId)` guard) — or add a patient-ownership subquery to the RLS INSERT/UPDATE `WITH CHECK`.

### 2. [HIGH] Corrected-age axis silently falls back to chronological past 36m — CONFIRMED
`components/dashboard/patients/growth/growth-chart.tsx:258` (also `:231`).
Beyond 36 corrected months `computePediatricAge` returns `corrected=null`, so `correctedMonths` becomes null and the point plots on the chronological axis while the "Idade corrigida" toggle still reads active → measurement scored against the wrong WHO age row (wrong z/percentile), no visual cue.
**Fix:** when `ageBasis === "corrected"` but corrected is null, either hide the point / show a "fora da faixa de correção" note, or keep the corrected label honest.

### 3. [MED-HIGH] Partial edit wipes cleared fields to `null` — CONFIRMED
`modules/patient-growth/update-measurement.ts:24` + `actions/patient-growth/update-measurement.ts:55`.
The action always passes explicit `null` (not `undefined`) for absent measures, so the module's `!== undefined` "only write provided fields" guard is dead. Clearing one field in an edit silently erases a previously stored measure. `update-measurement.spec.ts:121` gives false confidence it's non-destructive.
**Fix:** pass `undefined` (not `null`) for fields the user didn't touch, or make the module distinguish "cleared" from "untouched"; fix the misleading spec.

### 4. [MED] On-line P97/P3 mislabeled as out-of-band — CONFIRMED
`lib/growth-classification.ts:74` + `components/dashboard/patients/growth/growth-position-readout.tsx:22`.
The Abramowitz-Stegun CDF returns `97.0000065` for the exact P97 z (`1.8807936081512509`), so `p > 97` fires — a child *on* the P97 line reads "> P97" while one just below reads "no P97" (inverted).
**Fix:** compare with a small epsilon, or round before the `>`/`<` comparison, or clamp p to the drawn band z-values.

### 5. [MED] Unhandled rejection in delete dialog — CONFIRMED
`components/dashboard/patients/growth/remove-measurement-dialog.tsx:66`.
`try/finally` with no `catch`: if `deleteMeasurementAction` rejects (thrown/network) no error toast shows and the dialog silently re-enables.
**Fix:** add a `catch` → `toast.error("Não foi possível remover a medição.")`.

## Defense-in-depth / cleanup

- **6. [PLAUSIBLE]** RLS UPDATE `WITH CHECK` pins only `profile_id`, not `patient_id` → a row could be re-parented to another patient. `migration:68`. (Needs a new migration applied live.)
- **7.** Corrected-months recomputed by hand (`chronoMonths - offset/30.4375`) instead of reusing the engine's calendar-correct corrected age. `growth-chart.tsx:231`.
- **8.** Month-0 reference row drawn twice (Intergrowth `<=0` and WHO `>=0` both include `ageMonths==0`) → visible kink at corrected term. `growth-chart.tsx:206`.
- **9.** `kgToGrams` / `cmToMm` duplicated verbatim in create + update actions → extract a shared helper. `create-measurement.ts:17`.
- **10.** `PRETERM_THRESHOLD_WEEKS` redefined locally instead of importing the canonical const from `lib/compute-pediatric-age.ts`. `growth-chart.tsx:46`.

## Refuted (no action)
- BMI preterm mis-scoring — unreachable (age-window filter drops corrected-months<0 before standard resolution).
- P97 strict `>` producing "no P97" for on-line values — judged intended by one verifier (contradicts #4; treat #4 as the boundary-precision concern to confirm).
- `createMeasurementSchema` / `updateMeasurementSchema` near-duplication — judged acceptable.
- PC rendered with `formatLengthMm` — cm is the correct unit/precision for PC.

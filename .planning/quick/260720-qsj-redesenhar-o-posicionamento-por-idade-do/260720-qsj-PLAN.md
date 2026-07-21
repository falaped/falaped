---
phase: quick
plan: 260720-qsj
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/compute-pediatric-age.ts
  - lib/compute-pediatric-age.spec.ts
  - lib/vaccine-current-band.ts
  - lib/vaccine-current-band.spec.ts
  - lib/vaccine-bands.ts
  - lib/vaccine-bands.spec.ts
  - lib/vaccine-current-band-items.ts
  - lib/vaccine-current-band-items.spec.ts
  - lib/vaccine-band-carousel.ts
  - lib/vaccine-band-carousel.spec.ts
  - components/dashboard/vaccines/vaccine-column.tsx
  - components/dashboard/patients/patient-vaccine-calendar-section.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "A child exactly 6 chronological months old resolves to the '6 meses' band (not '5 meses')."
    - "A child exactly 2 chronological months old resolves to the '2 meses' band (NOT 'Ao nascer') — the engine's weeks-band gap is closed via a calendar totalMonths field."
    - "Every child age maps to exactly one canonical band via the 'faixa anterior' (greatest start <= months) rule."
    - "The calendar and in-profile card render the 11 canonical bands in fixed order; bands without seed vaccines render the existing empty state."
    - "Vaccine items are grouped into bands by their age_months → canonical band, independent of the seed age_label text."
    - "Preterm infants position by CHRONOLOGICAL months (corrected age no longer drives vaccine band placement)."
  artifacts:
    - "lib/vaccine-bands.ts (canonical bands + resolveBandForMonths + bandForItemMonths)"
    - "lib/vaccine-bands.spec.ts"
  key_links:
    - "computePediatricAge exposes a chronological totalMonths (differenceInMonths(today, birth)); computeCurrentMonths returns age.totalMonths, not floor(totalDays/30.4375) nor parts-based math (parts.months is absent in the days/weeks bands)."
    - "resolveCurrentBandLabel + computeOrderedBands + itemsForCurrentBand all derive from lib/vaccine-bands.ts."
    - "vaccine-column.tsx groupByAgeBand and patient-vaccine-calendar-section.tsx itemsForBand group by bandForItemMonths(age_months), not age_label equality."
---

<objective>
Redesign vaccine-calendar age positioning to use fixed canonical bands and fix the
off-by-one chronological month bug.

Purpose: Today `computeCurrentMonths` does `floor(totalDays / 30.4375)`, which
undershoots calendar age by ~1 month (a child exactly 6 months old computes as 5),
and band grouping keys off the seed `age_label` text (data-dependent, drifts across
datasets). The physician locked a single canonical timeline of 11 age bands and a
"faixa anterior" positioning rule. This makes positioning deterministic, data-
independent, and calendar-correct.

Output: a new single-source-of-truth module `lib/vaccine-bands.ts`; a corrected
`computeCurrentMonths`; band resolution/ordering/grouping helpers rewired onto the
canonical bands; the calendar view + in-profile card rendering the fixed timeline;
updated specs. `yarn typecheck` clean, `yarn test` green.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

@lib/compute-pediatric-age.ts
@lib/vaccine-current-band.ts
@lib/vaccine-current-band-items.ts
@lib/vaccine-band-carousel.ts
@lib/vaccine-band-status.ts
@modules/vaccines/types.ts
@components/dashboard/vaccines/vaccine-calendar-view.tsx
@components/dashboard/vaccines/vaccine-column.tsx
@components/dashboard/patients/patient-vaccine-calendar-section.tsx
@lib/vaccine-current-band.spec.ts
@lib/vaccine-current-band-items.spec.ts
@lib/vaccine-band-carousel.spec.ts

Conventions (CLAUDE.md): named exports only; one exported function per file in
lib/; JSDoc on exported functions; 2-space indent, double quotes; user-facing
strings PT-BR. Pure logic modules — no I/O, no next/cache, no next/headers.

Locked field names (verified in compute-pediatric-age.ts): `PediatricAge.status`
("ok" | ...), `PediatricAge.totalDays`, `PediatricAge.parts?: { years?, months?, weeks?, days? }`.

⚠️ CRITICAL — do NOT derive whole months from `parts`. The engine only fills
`parts.years`/`parts.months` in the `months_days` (≥84 days) and `years_months`
bands. In the `days` (0–28d) and `weeks` (29–83d) bands `parts` has NO months —
so `(parts.years ?? 0)*12 + (parts.months ?? 0)` would map a real 2-month-old
(≈61 days, weeks band) to 0 months → "Ao nascer" instead of "2 meses" (their
Penta/Pneumo/Rota visit). That is a clinical bug.

Correct approach: expose a chronological whole-month age directly from the engine.
Add `totalMonths: number` to `PediatricAge` (status "ok" only), computed
UNCONDITIONALLY as `differenceInMonths(today, birth)` (date-fns already imported;
`today`/`birth` are the local-midnight dates already computed in
`computePediatricAge`). `computeCurrentMonths` then returns `age.totalMonths`
(chronological). This is calendar-correct across ALL bands, including 2-month-olds.
Leave `corrected` untouched (vaccine positioning uses chronological only).

OUT OF SCOPE (physician follow-up, do NOT attempt): new vaccines for "7 a 14 anos",
nirsevimabe, "7 meses" seed content, influenza in multiple bands. Those bands may
render empty for now. No DB/seed migrations.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Engine calendar totalMonths + canonical bands module + chronological computeCurrentMonths</name>
  <files>lib/compute-pediatric-age.ts, lib/compute-pediatric-age.spec.ts, lib/vaccine-bands.ts, lib/vaccine-bands.spec.ts, lib/vaccine-current-band.ts, lib/vaccine-current-band.spec.ts</files>
  <behavior>
    lib/compute-pediatric-age.ts (add chronological whole-month age):
    - Add `totalMonths?: number` to the `PediatricAge` type (JSDoc: chronological whole calendar months; present only when status is "ok").
    - In `computePediatricAge`, after computing `totalDays`, compute `const totalMonths = differenceInMonths(today, birth)` and include it in the `result` object (alongside `totalDays`). `differenceInMonths` is already imported. Do NOT add it to `corrected` (chronological only).
    - This is calendar-correct for EVERY band (a 2-month-old ≈61 days in the `weeks` band yields totalMonths 2, not 0). Do not alter existing `band`/`parts`/`corrected` behavior — purely additive.

    lib/compute-pediatric-age.spec.ts:
    - Add cases asserting `totalMonths`: newborn (10 days) → 0; ~2 months (61-day-old, weeks band) → 2; exactly 6 calendar months → 6; 26 months → 26; and that non-"ok" statuses omit it (undefined). Keep all existing assertions intact.

    lib/vaccine-bands.ts:
    - Exports an ordered readonly list of the 11 canonical bands, each `{ label, startMonths }`, in this exact order and starts:
      "Ao nascer"=0, "2 meses"=2, "3 meses"=3, "4 meses"=4, "5 meses"=5, "6 meses"=6, "7 meses"=7, "9 meses"=9, "12 a 18 meses"=12, "4 a 6 anos"=48, "7 a 14 anos"=84.
    - `resolveBandForMonths(months)`: months null → null; otherwise the band with the GREATEST startMonths <= months ("faixa anterior"). months below 0 → null. A months value at or above 84 resolves to "7 a 14 anos".
    - `bandForItemMonths(ageMonths)`: same rule, reused for mapping a vaccine item's `age_months` to its canonical band; null ageMonths → null.
    - Test resolveBandForMonths at every boundary: 0→"Ao nascer", 1→"Ao nascer", 2→"2 meses", 6→"6 meses" (regression: NOT "5 meses"), 8→"7 meses", 9→"9 meses", 11→"9 meses", 12→"12 a 18 meses", 18→"12 a 18 meses", 26→"12 a 18 meses", 47→"12 a 18 meses", 48→"4 a 6 anos", 83→"4 a 6 anos", 84→"7 a 14 anos", 168→"7 a 14 anos", 200→"7 a 14 anos", null→null.
    - Test bandForItemMonths: age_months 0→"Ao nascer", 12→"12 a 18 meses", null→null.

    lib/vaccine-current-band.ts (computeCurrentMonths rewrite):
    - status !== "ok" → null (unchanged).
    - Return `age.totalMonths ?? null` — the CHRONOLOGICAL whole-month age from the engine. Do NOT read `parts` (absent in days/weeks bands) and do NOT read `corrected`. Drop the `AVG_DAYS_PER_MONTH` constant.
    - Delete `isBandCurrent` (its only consumer, resolveCurrentBandLabel, stops using it in Task 2) — confirm no other importer via grep before deleting; if any importer exists outside this plan's files, keep it and note in SUMMARY.
    - Test cases: age {status:"ok", totalMonths:6} → 6 (regression NOT 5); {status:"ok", totalMonths:2} → 2 (weeks-band 2-month-old, NOT 0); {status:"ok", totalMonths:0} → 0; {status:"ok", totalMonths:14} → 14; status "missing_birth_date"/"invalid"/"future" → null. Preterm case: an "ok" age carrying BOTH totalMonths (chronological) AND a `corrected` field returns the CHRONOLOGICAL totalMonths (corrected ignored).
  </behavior>
  <action>1) In lib/compute-pediatric-age.ts add `totalMonths?: number` to `PediatricAge` and set `result.totalMonths = differenceInMonths(today, birth)` (chronological, unconditional in the "ok" path; additive — do not touch band/parts/corrected). Add spec cases in lib/compute-pediatric-age.spec.ts (newborn→0, ~2mo weeks-band→2, 6mo→6, 26mo→26, non-ok→undefined). 2) Create lib/vaccine-bands.ts with the 11 canonical bands as an ordered exported constant plus pure `resolveBandForMonths` and `bandForItemMonths` (JSDoc, named exports, "faixa anterior" = greatest start <= months); add lib/vaccine-bands.spec.ts covering every boundary above. 3) Rewrite `computeCurrentMonths` in lib/vaccine-current-band.ts to return `age.totalMonths ?? null` (chronological) instead of `floor(totalDays/30.4375)`; drop `AVG_DAYS_PER_MONTH` and the `corrected` branch; remove the now-unused `isBandCurrent` export (grep the repo first to confirm no external importer). Update lib/vaccine-current-band.spec.ts: replace the `totalDays`/`corrected`-based cases with `totalMonths`-based cases (incl. the 6-months regression AND the 2-month weeks-band case) and remove all `isBandCurrent` tests; keep the node:test + assert scaffold. Write tests first (RED), then implement (GREEN).</action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn test 2>&1 | tail -20</automated>
  </verify>
  <done>PediatricAge exposes chronological totalMonths (differenceInMonths); lib/vaccine-bands.ts exports the 11 ordered bands + resolveBandForMonths + bandForItemMonths; computeCurrentMonths returns age.totalMonths (6→6 not 5, 2→2 not 0) and ignores corrected age; isBandCurrent removed (or retained only if an external importer exists); all specs pass; yarn test green.</done>
</task>

<task type="auto">
  <name>Task 2: Rewire band resolution, ordering, and grouping onto canonical bands</name>
  <files>lib/vaccine-current-band-items.ts, lib/vaccine-current-band-items.spec.ts, lib/vaccine-band-carousel.ts, lib/vaccine-band-carousel.spec.ts</files>
  <action>Rewrite the three grouping/ordering helpers to derive from lib/vaccine-bands.ts instead of seed `age_label` text:

- `resolveCurrentBandLabel(schedules, currentMonths)`: keep the exported signature (callers pass `[sus, sbim]`), but ignore the `schedules` arg for resolution — return `resolveBandForMonths(currentMonths)?.label ?? null`. Update JSDoc to state it is now data-independent (no seed-window scan). Remove the `isBandCurrent` import.
- `computeOrderedBands(schedules)`: keep the exported signature, ignore `schedules`, and return the 11 canonical band labels in fixed order (map the canonical list to `label`). Update JSDoc.
- `itemsForCurrentBand(schedule, bandLabel)`: return items whose CANONICAL band (from `bandForItemMonths(item.age_months)`) equals `bandLabel`, not items whose `age_label === bandLabel`. Null schedule or null bandLabel → []. Items with null `age_months` fall into no band (excluded). Preserve source order.

Update lib/vaccine-current-band-items.spec.ts: resolveCurrentBandLabel now depends only on months (e.g. currentMonths 99 → "7 a 14 anos", NOT null — the old "past last band → null" case is gone; adjust that assertion). itemsForCurrentBand cases must key off `age_months` mapping to canonical bands (e.g. a seed item with age_months 4 and age_label "4 meses" belongs to "4 meses"; a seed item with age_months 14 belongs to "12 a 18 meses"). Update lib/vaccine-band-carousel.spec.ts: computeOrderedBands now returns the fixed 11-band list regardless of input (replace the union/min-sort assertions with fixed-list assertions, including that null datasets still yield the 11 bands). resolveCurrentBandIndex tests stay valid but update band-list fixtures to canonical labels where an assertion expects a hit. Do NOT place any negative-grep literals in this action.</action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn test 2>&1 | tail -20 && yarn typecheck 2>&1 | tail -5</automated>
  </verify>
  <done>resolveCurrentBandLabel returns resolveBandForMonths(...).label; computeOrderedBands returns the 11 canonical labels in order; itemsForCurrentBand groups by bandForItemMonths(age_months); all three specs pass; yarn typecheck clean.</done>
</task>

<task type="auto">
  <name>Task 3: Render canonical bands in calendar column + in-profile card</name>
  <files>components/dashboard/vaccines/vaccine-column.tsx, components/dashboard/patients/patient-vaccine-calendar-section.tsx</files>
  <action>Point both surfaces' item grouping at the canonical bands so they render the fixed timeline and group items by `age_months`, not `age_label`.

- vaccine-column.tsx: replace the local `groupByAgeBand` (which keys on `item.age_label`) so it keys each item by `bandForItemMonths(item.age_months)?.label` (import from @/lib/vaccine-bands). Items whose age_months maps to no band are skipped. The `orderedBands` prop is already the canonical list (from computeOrderedBands, Task 2), so the existing `orderedBands.map(...)` loop and the existing "—" empty-band state (`aria-label="Sem vacina prevista nesta faixa"`) are unchanged; only the grouping key changes. Keep all styling, the "Idade atual" badge, and provenance footer.
- patient-vaccine-calendar-section.tsx: replace the local `itemsForBand(schedule, bandLabel)` filter (which compares `item.age_label === bandLabel`) with a filter comparing `bandForItemMonths(item.age_months)?.label === bandLabel` (import from @/lib/vaccine-bands). Null schedule → []. Everything else (timeline dots, current-band resolution via computeCurrentMonths → resolveCurrentBandLabel, toggle logic, tallies, the existing "— sem vacina prevista" empty state) stays as-is. orderedBands is already the canonical 11 from computeOrderedBands.

Preserve PT-BR user-facing strings, 2-space indent, double quotes. No new deps.</action>
  <verify>
    <automated>cd /Users/goker1/falaped && yarn typecheck 2>&1 | tail -5 && yarn test 2>&1 | tail -8</automated>
  </verify>
  <done>Both components group items by canonical band (bandForItemMonths(age_months)) and render the fixed 11-band timeline; empty bands show the existing empty state; yarn typecheck clean; yarn test green; no visual/string regressions in the untouched UI.</done>
</task>

</tasks>

<verification>
- `yarn test` green (all vaccine specs: vaccine-bands, vaccine-current-band, vaccine-current-band-items, vaccine-band-carousel, vaccine-band-status).
- `yarn typecheck` clean.
- Regression proof: a child exactly 6 chronological months old → band "6 meses" (not "5 meses"), asserted via computeCurrentMonths (totalMonths 6→6) and resolveBandForMonths (6→"6 meses").
- Weeks-band proof: a ~2-month-old (≈61 days) → totalMonths 2 → band "2 meses" (NOT "Ao nascer"), asserted in compute-pediatric-age.spec.ts and vaccine-current-band.spec.ts.
- Boundary masses from the locked spec all covered: 8m10d→"7 meses", 9m/11m→"9 meses", 12m15d/18m/26m/47m→"12 a 18 meses", 48m/83m→"4 a 6 anos", 84m/168m/>168m→"7 a 14 anos".
- Preterm (gestational <37wk) positions by CHRONOLOGICAL months for band placement (corrected ignored in this path).
- No DB/seed migration touched; grouping is data-independent (keys off age_months, not age_label).
</verification>

<success_criteria>
- lib/vaccine-bands.ts is the single source of truth for the 11 canonical bands and the "faixa anterior" rule.
- computeCurrentMonths uses engine calendar parts (chronological), fixing the ~1-month undershoot.
- resolveCurrentBandLabel / computeOrderedBands / itemsForCurrentBand and both components all derive from the canonical bands.
- yarn test green, yarn typecheck clean.
- OUT-OF-SCOPE items (new "7 a 14 anos" vaccines, nirsevimabe, "7 meses" content, multi-band influenza) untouched; those bands render empty.
</success_criteria>

<output>
Create `.planning/quick/260720-qsj-redesenhar-o-posicionamento-por-idade-do/260720-qsj-SUMMARY.md` when done.
</output>

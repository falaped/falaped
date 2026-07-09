# Phase 3: Curva de Crescimento - Research

**Researched:** 2026-07-09
**Domain:** Pediatric anthropometry / growth-curve visualization (WHO + Intergrowth-21st reference), Next.js 16 + React 19 charting, Supabase measurement history
**Confidence:** MEDIUM (stack HIGH; reference-data sourcing MEDIUM; corrected-age engine HIGH)

## Summary

This phase adds a **per-patient anthropometric measurement history** (peso, comprimento/estatura, perímetro cefálico; IMC derived) and a **growth-curve view** that plots those measurements over WHO reference percentile/z-score bands, positioned by the Phase 1 pediatric age engine. It is the first consumer of `lib/compute-pediatric-age.ts`.

Three decision-critical unknowns are resolved here: (1) **chart library** — the project has NO chart lib today (verified against STACK.md and `package.json`); recommend **Recharts** (SVG, React-19-compatible, SSR-safe). (2) **Reference datasets** — WHO publishes the standards as **LMS parameters (L, M, S)** per indicator/sex/age; storing the compact LMS tables (a few hundred rows each) as **static versioned JSON** and deriving both the reference curve lines and the child's z-score/percentile at runtime via the Cole–Green formula is far lighter than shipping pre-computed percentile tables. (3) **Corrected age to 36 months** — Phase 1's engine hard-caps corrected age at 24 months (`CORRECTED_AGE_CUTOFF_MONTHS = 24`, landmine D-07); this phase needs 36m, so the engine must be **extended (parameterize the cutoff)** rather than reused blindly.

**Primary recommendation:** Recharts for rendering + a small pure `lib/lms-zscore.ts` helper implementing `Z = ((X/M)^L − 1)/(L·S)` and its inverse; WHO LMS tables as static versioned JSON under `lib/growth-reference/`; a new `patient_measurements` table scoped by `profile_id + patient_id` with explicit ownership filters (no RLS backstop exists); parameterize the Phase 1 corrected-age cutoff to reach 36 months. Phase the dataset ingestion **per indicator** (start weight-for-age) since 4 indicators × 2 sexes × 2 age spans is meaningful content work.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** WHO (OMS) as base standard — 0–5y + 5–19y — **plus Intergrowth-21st** for the preterm/newborn period. OMS is the Ministério da Saúde / Caderneta da Criança standard in Brazil.
- **D-02:** Plot **4 curves**: peso/idade, estatura(comprimento)/idade, IMC/idade, perímetro cefálico/idade. All **sex-specific** (use `patients.sex`: `masculino`/`feminino`).
- **D-03:** Target range **0–19 years**, respecting each curve's official data ceiling (weight-for-age ~10y; height & BMI to 19y; head-circ ~5y). Each curve covers only where reference data exists.
- **D-04:** For preterm infants, **plot both points** on the WHO curve — chronological age AND corrected age, side by side. Intergrowth-21st is the reference for the preterm/newborn period (transition to WHO).
- **D-05:** Apply prematurity correction **up to 36 months (3 years)**.
- **D-06:** Corrected age used **automatically when `gestational_age_weeks` < 37 wk**, with a **manual toggle** in the chart to switch chronological ↔ corrected.
- **⚠️ D-07 (landmine):** `lib/compute-pediatric-age.ts` **caps corrected age at 24 months**. Correction here goes to 36 months — the engine must be **extended** OR corrected age computed locally to 3 years. Do NOT reuse the 24m cap blindly.
- **D-08:** Measurement history is a **NEW, separate table/structure**. The existing scalar `weight`/`height`/`head_circumference` on `patients` **stay and coexist** (hand-edited reference value feeding the current IMC card in `patient-clinical-overview.tsx`). **Do NOT migrate or retire** these fields in this MVP.
- **D-09:** Registration and history live **on the patient profile screen** (not in the case/consultation flow this MVP).
- **D-10:** Allow **retroactive (past-dated) measurements** to build history for children already being followed.
- **D-11:** Each measurement may carry weight and/or height and/or head-circ (optional fields); **BMI is derived** when weight AND height exist in the same measurement.
- **D-12:** Reference lines with a **toggle between percentile (P3/P15/P50/P85/P97) and z-score (−3 to +3 SD)** in the same chart.
- **D-13:** **Compute and show the child's own position** per measurement: percentile/z-score + **classification** (e.g. "peso no P75", "IMC: eutrófico/sobrepeso"). Reuse the existing IMC band logic (`lib/patient-bmi-ui-status.ts`).
- **D-14:** Every read/write/edit/delete of a measurement scoped by `profile_id` + `patient_id`, behind the `paid` gate, with an **ownership test** (app has **no table RLS** — CONCERNS Pitfall 5). The doctor can **edit and remove** history measurements.

### Claude's Discretion
- Chart library / technique (no chart lib exists — consider SVG/Recharts/visx, bundle weight, ability to plot dense reference lines).
- Exact measurement-table model (columns, stored units) and how measurement age is derived (measurement date − birth date via Phase 1 engine).
- Input units & validation (kg/g, cm), formatting, plausible limits.
- How to store/serve the WHO/Intergrowth reference datasets (versioned table, versioned static JSON, etc.), as long as source + covered age range are shown.

### Deferred Ideas (OUT OF SCOPE)
- **PDF/print of the curve** — MVP is on-screen only.
- **Measurement recording inside the case/consultation flow** — profile only this MVP.
- **Automatic growth-deviation alerts/signals** — out of scope.
- **Migrating/retiring the scalar `weight`/`height`/`head_circumference` fields** — decided to coexist now (D-08).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GROWTH-01 | Register/edit/delete anthropometric measurements (weight, length/height, head-circ; BMI derived) with date, as a per-patient history scoped by `profile_id` + `patient_id` | Data Model section (new `patient_measurements` table, optional columns, derived BMI, retroactive `measured_on`); module/action pattern per supabase-falaped skill |
| GROWTH-02 | Show growth-curve charts per age (weight/age, height/age, BMI/age, head-circ/age) overlaying patient measurements on WHO reference (percentile/z-score), with source + covered age range visible | Chart Library (Recharts) + Reference Datasets (WHO LMS static JSON) + LMS→curve-line derivation; percentile/z toggle (D-12) |
| GROWTH-03 | Measurements positioned by Phase 1 pediatric age; read/write/delete apply `paid` gate + scope by `profile_id` (no cross-doctor access) | Corrected-age engine extension (D-07); Common Pitfalls (ownership/IDOR); age-at-measurement derivation |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persist / edit / delete measurements | API/Backend (`actions/patient-growth/` → `modules/patient-growth/`) | Database (`patient_measurements`) | Follows 3-layer pattern; ownership filter must run server-side (no RLS) |
| Ownership + `paid` gate | API/Backend (actions) | Database (explicit `profile_id` filter) | D-14 / CONCERNS Pitfall 5 — app-layer is the only isolation line |
| Age-at-measurement + corrected age | Shared pure lib (`lib/compute-pediatric-age.ts`, extended) | — | Pure, testable; reused by Phases 3/5/6 |
| z-score / percentile / classification | Shared pure lib (`lib/lms-zscore.ts` + reuse `lib/patient-bmi-ui-status.ts`) | — | Pure math from LMS tables; unit-testable |
| WHO/Intergrowth reference data | Static versioned asset (`lib/growth-reference/*.json`) | Build/bundle | Read-only content, versioned; no DB round-trip needed |
| Curve rendering (reference bands + patient points) | Browser/Client (Recharts component) | Frontend Server (SSR of initial data) | SVG chart is interactive (toggle percentile/z, chronological/corrected) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `recharts` | `^3.9.0` (pin a fixed patch, see audit) | Growth-curve SVG rendering: `LineChart`/`ComposedChart` for reference band lines + `Scatter` for patient measurements | `[VERIFIED: npm registry]` react ^19 in peerDependencies; SVG so SSR-safe under App Router; 53M weekly downloads; shadcn's own charts wrap it |
| `date-fns` | `^4.1.0` (already installed) | Derive age at measurement (`measured_on − birth_date`) via the Phase 1 engine | Already the project's date lib; Phase 1 engine built on it |
| `zod` | `^4.3.6` (already installed) | Validate measurement input at the action boundary | Project standard; `lib/schemas/` pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` + `@hookform/resolvers` | installed | Measurement entry form state | Follows existing `patient-form` pattern |
| `lucide-react` | installed | Icons for chart toggles / empty state | Existing icon set |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | **visx** (`@visx/*`) | `[CITED: blog.logrocket.com]` More control + smaller if tree-shaken, but low-level: you hand-build axes/scales/tooltips. More MVP effort for dense reference bands. Choose only if Recharts' declarative model proves limiting. |
| Recharts | **hand-rolled SVG + `d3-scale`** | Minimal bundle, full control of dense reference lines, but you re-implement axes/legends/tooltips/responsiveness. Highest effort; not MVP-appropriate. |
| Recharts | **MUI X Charts / Victory** | `[CITED: blog.logrocket.com]` Also SSR-friendly SVG, but MUI pulls in MUI theming; Victory is heavier. No fit advantage here. |

**Installation:**
```bash
yarn add recharts@3.9.0
```
*(Project is yarn-only — never `npm install`. Pin an exact patch; see Package Legitimacy Audit.)*

**Version verification:** `npm view recharts version` → `3.9.2` (published 2026-07-04). `npm view recharts peerDependencies` → `react: '^16.8.0 || ^17 || ^18 || ^19'`. `[VERIFIED: npm registry]`

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `recharts` | npm | repo 8+ yrs; **3.9.2 patch published 2026-07-04** | 53.2M/wk | github.com/recharts/recharts | **SUS (too-new)** | **Approved with pin** |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `recharts` — the seam flags `too-new` **only because the latest patch `3.9.2` is 5 days old**. This is a false positive on a patch bump: the package itself is 8+ years old, has 53M weekly downloads, a matching public repo, and **no postinstall script** (`npm view recharts scripts.postinstall` → empty). Recommendation for the planner: **pin an exact, slightly-older stable patch** (e.g. `recharts@3.9.0`) to avoid shipping a same-week release, and add ONE `checkpoint:human-verify` before install to confirm the pinned version installs cleanly under React 19 with no `react-is` conflict. Do not treat this as a genuine slop risk.

*No package was discovered via WebSearch alone and left unverified — `recharts` is cross-checked against the npm registry (peer deps, downloads, repo) AND is the library shadcn/ui itself wraps.*

## Reference Datasets — WHO + Intergrowth-21st (the STATE.md blocker)

This is the heaviest content unknown. Findings:

### Official sources (verifiable)
- **WHO Child Growth Standards, 0–5 years** — `https://www.who.int/tools/child-growth-standards/standards` — indicators: weight-for-age, length/height-for-age, BMI-for-age, head-circumference-for-age; boys/girls; both **z-score** and **percentile** tables. `[CITED: who.int/tools/child-growth-standards/standards]`
- **WHO Growth Reference, 5–19 years** — `https://www.who.int/tools/growth-reference-data-for-5to19-years` — indicators: height-for-age, BMI-for-age, weight-for-age (weight-for-age only to ~10y). `[CITED: who.int/tools/growth-reference-data-for-5to19-years]`
- **INTERGROWTH-21st** — preterm postnatal growth + newborn standards, at `intergrowth21.com` (and `intergrowth21.tghn.org`). Preterm/newborn reference for D-04. `[ASSUMED]` exact machine-readable download format not verified this session — see Assumptions A2.
- **CDC "WHO-based" data files** (`cdc.gov/growthcharts/who-data-files.htm`) repackage the WHO 0–5 LMS as CSV/Excel with explicit **L, M, S** columns (0–24m and 2–5y splits). `[CITED: cdc.gov/growthcharts/who-data-files.htm]` (page 403s to WebFetch bots but is the documented distribution; access manually.)

### Data format — LMS parameters, not pre-computed percentile tables
The WHO standards are built with the **LMS (Cole–Green) method**: each (indicator, sex, age-in-months) row is three numbers **L (skewness λ), M (median µ), S (coefficient of variation σ)**. `[VERIFIED: metricgate.com/docs/growth-chart-lms-method + who.int computation.pdf]`

**Storing LMS is the compact choice.** One row per month:
- WHO 0–5y ≈ 61 monthly rows (or ~1856 daily rows if using the day-based tables — prefer monthly for MVP).
- WHO 5–19y ≈ 168 monthly rows.
- × 2 sexes × 4 indicators (respecting each ceiling, D-03).

Rough volume with **monthly LMS**: on the order of **a few thousand rows total** across everything — trivially a few hundred KB of JSON, tree-shakeable per indicator. Pre-computed percentile tables (7 percentile columns instead of 3 LMS) would be ~2× larger AND still can't answer "child is at P42" without interpolation. **LMS wins on both size and capability.**

### Deriving percentile ↔ z-score from LMS
Pure math, put in `lib/lms-zscore.ts` (unit-tested). `[VERIFIED: who.int computation.pdf + metricgate LMS docs]`
```
// child measurement X at age t → z-score
z = L !== 0 ? (Math.pow(X / M, L) - 1) / (L * S)
            : Math.log(X / M) / S
// z-score → percentile (standard normal CDF)
percentile = normalCdf(z) * 100
// reference curve LINE for a given centile/z (to draw P3..P97 or z −3..+3):
X = L !== 0 ? M * Math.pow(1 + L * S * z, 1 / L)
            : M * Math.exp(S * z)   // e.g. z = -1.881 for P3, 0 for P50, +1.881 for P97
```
Percentile↔z map for the D-12 toggle: P3≈z−1.881, P15≈z−1.036, P50=0, P85≈z+1.036, P97≈z+1.881. The **same LMS rows** feed both the percentile view and the z view — the toggle only changes which z-values you evaluate the curve-line formula at. No second dataset needed.

### Storage strategy — static versioned JSON (recommended)
- Location: `lib/growth-reference/who/<indicator>-<sex>.json` (+ `lib/growth-reference/intergrowth/...`). Each file: `{ source, standard, sex, indicator, ageUnit, ageMin, ageMax, version, rows: [{ ageMonths, L, M, S }] }`.
- A small index module exposes `getReferenceTable(standard, indicator, sex)` returning rows + the `source`/`ageMin`/`ageMax` metadata the UI must display (D-02/D-03 require source + covered range visible).
- **Versioned** = the `version`/`source` fields are rendered in the UI and the file is committed to git; no DB migration churn. This directly satisfies the STATE.md blocker ("versioned, source + age range visible").
- **Why not a DB table:** read-only reference content, identical for all tenants, needs no per-request query, no RLS concern, and benefits from being bundled/tree-shaken. A DB table would add a query + migration for zero isolation benefit.

### Phasing per indicator (recommended for the volume)
Ingesting 4 indicators × 2 sexes × 2 WHO spans + Intergrowth is real content work with accuracy risk (see STATE.md blocker + Pitfall below). **Split the plan per indicator**, starting with **weight-for-age** (the doctor's most-used curve) as the vertical slice, then height/age, BMI/age, head-circ/age. The chart component and LMS helper are indicator-agnostic, so later indicators are pure data + a tab.

## Corrected Age for Prematurity (D-04..D-07)

**Current engine** (`lib/compute-pediatric-age.ts`): `computePediatricAge(birthDateIso, now, gestationalAgeWeeks)` already computes corrected age by shifting the birth date forward `(40 − gestationalAgeWeeks)` weeks when `gestationalAgeWeeks < 37`, but **stops at `CORRECTED_AGE_CUTOFF_MONTHS = 24`**. `[VERIFIED: read lib/compute-pediatric-age.ts]`

**Recommendation — extend, don't fork.** Parameterize the cutoff so this phase can request 36 months without duplicating the (well-tested, edge-case-hardened) date math:
- Add an optional `correctedAgeCutoffMonths` parameter (or an options object) to `computePediatricAge`, defaulting to `24` so Phase 1 callers are unchanged. Growth code calls with `36`.
- Keep `CORRECTED_AGE_CUTOFF_MONTHS = 24` as the default constant; add a `GROWTH_CORRECTED_AGE_CUTOFF_MONTHS = 36` constant near it.
- Extend `lib/compute-pediatric-age.spec.ts`: add cases at 30m and 35m corrected (present) and 37m corrected (absent) with the new cutoff, and a regression test proving the default still cuts at 24m.
- Do **not** re-implement corrected-age math locally in growth code — that would re-introduce the timezone/leap-year traps the engine already solves.

**Age at each measurement:** for a measurement dated `measured_on`, call `computePediatricAge(birth_date, measured_on, gestational_age_weeks, { correctedAgeCutoffMonths: 36 })`. Use `totalDays` (or a months value) to index the LMS table. Pass `measured_on` as the `now` argument — the engine already accepts an explicit reference instant, so retroactive dates (D-10) just work.

**Intergrowth → WHO transition rule (D-04).** Standard clinical convention: use **Intergrowth-21st for the preterm/newborn period** (from birth until ~term-corrected, i.e. corrected age 0 / 40 weeks PMA), then **WHO from corrected term onward**. Concretely for the chart:
- If preterm and the measurement's corrected age < 0 (still before term-equivalent), plot on the Intergrowth curve.
- From corrected term (corrected age ≥ 0) up to 36m, plot on the **WHO** curve using **corrected age** by default (D-06 auto when `< 37` wk).
- Recommendation for A1 confirmation with the physician: whether to keep showing Intergrowth after term or switch entirely to WHO at term (most protocols switch to WHO at term-corrected).

**Two points without clutter (D-04).** On the WHO curve, plot the same measurement at **two x-positions** — chronological age and corrected age — as a connected pair (e.g. a faint connector line + two markers, corrected marker emphasized). Provide the D-06 toggle to show only one at a time; default view for `< 37` wk infants shows corrected (primary) with chronological available. Do **not** draw both for every historical point at once if it clutters — the toggle is the declutter mechanism.

## Data Model (GROWTH-01, D-08/D-10/D-11)

New table `public.patient_measurements` (new module `modules/patient-growth/`). Coexists with the scalar `patients.weight/height/head_circumference` (D-08 — do not touch those).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `profile_id` | `uuid not null` | ownership anchor (D-14); FK → `profiles(id)` |
| `patient_id` | `uuid not null` | FK → `patients(id) on delete cascade` |
| `measured_on` | `date not null` | retroactive allowed (D-10); the date, not a timestamp |
| `weight_grams` | `integer` (nullable) | store grams (integer) to avoid float drift; render kg. Optional (D-11) |
| `length_height_mm` | `integer` (nullable) | store millimetres (integer); render cm. Optional (D-11) |
| `head_circumference_mm` | `integer` (nullable) | store mm. Optional (D-11) |
| `created_at` / `updated_at` | `timestamptz default now()` | |

**Units decision:** store the smallest sensible integer unit (**g, mm**) to sidestep floating-point rounding; convert at the UI/validation boundary. BMI is **not stored** — it is **derived** (`weight_kg / height_m²`) only when both weight and height exist in the same row (D-11), reusing `lib/parse-anthropometrics-for-bmi.ts` (`computePediatricBmi`). A row must have **at least one** of the three measurements (enforce in Zod and with a table CHECK).

**Migration pattern:** follow `supabase/migrations/20260604000002_rls_patients.sql` — but note the RLS caveat below. The migration should:
1. `create table public.patient_measurements (...)` with FKs + `check (weight_grams is not null or length_height_mm is not null or head_circumference_mm is not null)`.
2. Index `(profile_id, patient_id, measured_on)` for the history/chart query.
3. **Enable RLS + owner-scoped policies** mirroring the patients migration (select/insert/update/delete keyed to `profile_id in (select id from profiles where auth_user_id = auth.uid())`). Even though existing tables were retrofitted with RLS late, a NEW table should ship RLS from day one — but the app layer STILL must add explicit `.eq("profile_id", ...)` (defense-in-depth; see Pitfall 1).

**Age derivation:** never store age; always derive from `measured_on − patients.birth_date` via the extended Phase 1 engine at read time. Birth date can be edited, so a stored age would go stale.

## Positioning + Classification (D-13)

- Per measurement: derive age (months/days) → look up LMS row (interpolate between adjacent months if using monthly tables) → compute z and percentile via `lib/lms-zscore.ts`.
- **Classification:** reuse `lib/patient-bmi-ui-status.ts` for the IMC band (`good`/`warn`/`bad` → eutrófico/sobrepeso/etc.). NOTE: that file currently classifies BMI with **hard-coded age bands** and has its OWN `getAgeInMonthsFromBirthDate` using the `T12:00:00` noon hack — for the curve, prefer the WHO z-score-based classification (z < −2 / −2..+1 / +1..+2 / > +2 → magreza/eutrofia/sobrepeso/obesidade per WHO cutoffs) computed from LMS, and reuse `patient-bmi-ui-status`'s **color mapping** only. Keep the existing card intact (D-08) but do not treat its heuristic bands as the source of truth for the curve.
- Label copy (PT-BR): "Peso no P75", "IMC: eutrófico" etc. `[ASSUMED]` exact Brazilian classification wording — confirm with physician (A3).

## Architecture Patterns

### System Architecture Diagram
```
[Patient profile page: app/dashboard/patients/[id]]
        │
        ├── Measurement form (client, react-hook-form + zod)
        │        │  submit
        │        ▼
        │   actions/patient-growth/create-measurement.ts  ("use server")
        │        │  getAuthenticatedUser → paid gate → zod.safeParse
        │        ▼
        │   modules/patient-growth/create-measurement.ts  (inject SupabaseClient)
        │        │  .insert(...).eq scope | ownership by profile_id+patient_id
        │        ▼
        │   Supabase: public.patient_measurements  (RLS + app-layer filter)
        │
        └── Growth chart (client)
                 │  reads: modules/patient-growth/get-measurements-by-patient.ts
                 │  reads: lib/growth-reference/*.json (static, versioned)
                 ▼
             lib/compute-pediatric-age.ts (extended, cutoff=36)  →  age per measurement
             lib/lms-zscore.ts  →  z/percentile per point + reference band lines
                 ▼
             Recharts <ComposedChart>: reference band <Line>s (P3..P97 or z−3..+3)
                                        + patient <Scatter> (chrono + corrected points)
```

### Recommended Project Structure
```
modules/patient-growth/
├── create-measurement.ts          # one query per file (supabase-falaped skill)
├── get-measurements-by-patient.ts
├── update-measurement.ts
├── delete-measurement.ts
├── types.ts                        # Measurement type (snake_case DB shape)
└── *.spec.ts
actions/patient-growth/
├── create-measurement.ts          # createMeasurementAction (paid gate + zod + ownership)
├── update-measurement.ts
├── delete-measurement.ts
└── index.ts                        # barrel; re-export from actions/index.ts
lib/
├── lms-zscore.ts (+ .spec.ts)      # pure LMS math
├── growth-reference/
│   ├── index.ts                    # getReferenceTable(standard, indicator, sex)
│   ├── who/weight-for-age-boys.json ... (per indicator × sex)
│   └── intergrowth/...
components/dashboard/patients/growth/
├── growth-section.tsx              # wraps chart + form + history, in patient detail
├── growth-chart.tsx                # Recharts ComposedChart
├── measurement-form.tsx
└── measurement-history-table.tsx
app/dashboard/patients/[id]/        # add growth section near patient-clinical-overview
supabase/migrations/2026NNNN_patient_measurements.sql
lib/schemas/patient-measurement.ts  # zod input/output schemas
```

### Pattern 1: Recharts reference bands + patient scatter
**What:** `ComposedChart` with numeric x-axis = age (months), several `<Line dot={false}>` for reference centiles/z-lines, one `<Scatter>` for the patient's points.
**When to use:** every one of the 4 curves (indicator-agnostic component; pass data + reference table).
```tsx
// Source pattern (Recharts 3.x, react-19 compatible): https://recharts.org
// Reference lines computed from LMS via lib/lms-zscore.ts (X = M*(1+L*S*z)^(1/L))
<ResponsiveContainer width="100%" height={360}>
  <ComposedChart>
    <XAxis type="number" dataKey="ageMonths" domain={[ageMin, ageMax]} />
    <YAxis type="number" />
    {referenceLines.map((line) => (
      <Line key={line.label} data={line.points} dataKey="value"
            dot={false} strokeWidth={line.label === "P50" ? 2 : 1} />
    ))}
    <Scatter data={patientPoints} dataKey="value" />
    <Tooltip /><Legend />
  </ComposedChart>
</ResponsiveContainer>
```

### Anti-Patterns to Avoid
- **Storing computed age or computed percentile in the DB** — birth date is editable; recompute at read time.
- **A DB table for WHO reference data** — read-only, tenant-identical content belongs in versioned static assets.
- **Reusing the 24m corrected-age cap for the 36m chart** (D-07) — extend the engine parameter instead.
- **`import Recharts` without `"use client"`** — the chart is interactive (toggles); the chart component must be a client component. The initial measurement data can still be fetched server-side and passed as props.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG axes, scales, tooltips, responsive resize | Custom `<svg>` + manual `d3-scale` | **Recharts** | Axes/legend/tooltip/responsiveness are deceptively fiddly; Recharts is SSR-safe SVG, React-19-ready |
| Percentile ↔ z-score conversion | Ad-hoc curve interpolation | **LMS/Cole–Green formula** on WHO's own L,M,S | The standards ARE LMS; the closed-form gives exact z and exact centile lines |
| Corrected pediatric age (leap years, TZ, month-length) | New local date math | **Extended `computePediatricAge`** | Phase 1 engine already solves the edge cases (see its spec) |
| BMI compute + color band | New BMI code | `lib/parse-anthropometrics-for-bmi.ts` + `lib/patient-bmi-ui-status.ts` color map | Already exists; D-13 says reuse |
| Brazilian date input parsing | New parser | `lib/brazilian-date-form.ts` | Established `dd/mm/aaaa ↔ yyyy-mm-dd` parser used by patient form |

**Key insight:** The only genuinely new code is (a) the measurement CRUD slice, (b) the pure `lib/lms-zscore.ts`, (c) the static WHO/Intergrowth JSON, and (d) a Recharts wrapper. Everything else composes existing, tested pieces.

## Common Pitfalls

### Pitfall 1: Missing `profile_id` ownership filter (IDOR) — CONCERNS Pitfall 5
**What goes wrong:** A doctor edits/deletes another doctor's measurement by supplying its UUID. CONCERNS documents this exact bug already shipped in `deletePrescription`/`deleteMedicalCertificate` (`.delete().eq("id", ...)` with no owner filter).
**Why it happens:** Relying on "RLS will catch it" while writing app-layer queries; or forgetting to thread `profile.id` into the module.
**How to avoid:** Every `select/update/delete` in `modules/patient-growth/` includes `.eq("profile_id", profileId).eq("patient_id", patientId)`. Ship RLS on the new table AND keep the app filter (defense-in-depth). Add an ownership unit test (CONCERNS notes the IDOR "would have been caught by a single ownership test").
**Warning signs:** A delete/update query keyed only by `id`.

### Pitfall 2: Recharts + React 19 `react-is` peer conflict
**What goes wrong:** Install-time peer warnings / runtime error on Recharts 2.x under React 19.
**Why it happens:** Older Recharts (2.15.x) required a `react-is` override matching React 19.
**How to avoid:** Use **Recharts 3.x** (peer deps list react ^19 directly — `[VERIFIED: npm registry]`). If any `react-is` warning appears, add a package.json `resolutions` (yarn) pinning `react-is` to the React 19 line.
**Warning signs:** `Invalid hook call` or `react-is` version mismatch at build.

### Pitfall 3: Reference-data accuracy (the STATE.md blocker)
**What goes wrong:** Wrong sex file, wrong age unit (days vs months), or transcription error in L/M/S → clinically misleading curve.
**Why it happens:** Manual ingestion of many tables; WHO ships separate files per indicator/sex/age-span.
**How to avoid:** Ingest from ONE canonical source per indicator (prefer WHO's own tables / CDC's WHO-based LMS CSV). Add a spot-check spec: for a known age+sex, the computed P50 must equal the WHO `M` value, and P3/P97 must match WHO's published percentile table within rounding. Show `source` + `version` + covered age range in the UI (D-02/D-03). Flag the dataset for physician confirmation (STATE.md blocker; A2/A3).
**Warning signs:** P50 line not matching the published median; curve discontinuity at the 5y (0–5 → 5–19) or term (Intergrowth → WHO) join.

### Pitfall 4: Timezone off-by-one on `measured_on`
**What goes wrong:** `new Date("YYYY-MM-DD")` parses as UTC midnight → wrong day in BRT → wrong age bucket.
**Why it happens:** The classic JS date trap the Phase 1 engine explicitly avoids.
**How to avoid:** Store `measured_on` as a `date` (no time). Pass the ISO date-only string to `computePediatricAge` (which builds local midnight). Never `new Date(isoDate)` directly. Note `lib/patient-bmi-ui-status.ts` uses the `T12:00:00` noon hack — do not copy that into the curve path.

### Pitfall 5: `patients.sex` may be null
**What goes wrong:** Curves are sex-specific (D-02); a null `sex` has no reference curve.
**How to avoid:** If `sex` is null, show an empty/prompt state ("Informe o sexo do paciente para exibir a curva") rather than defaulting to one sex. `sex` is optional in the patient schema.

## Code Examples

### Age at a (possibly retroactive) measurement, corrected to 36m
```typescript
// Source: lib/compute-pediatric-age.ts (extended per D-07)
const age = computePediatricAge(
  patient.birth_date,          // "YYYY-MM-DD"
  new Date(`${measuredOn}`),   // measurement date as the reference instant (D-10)
  patient.gestational_age_weeks,
  { correctedAgeCutoffMonths: 36 }, // NEW option, default 24 for Phase 1 callers
)
// age.totalDays / age.parts → x position; age.corrected → the corrected x (D-04/D-06)
```

### LMS → z-score and centile line (pure)
```typescript
// Source: WHO computation.pdf + Cole–Green LMS. Put in lib/lms-zscore.ts
export function lmsZScore(x: number, { L, M, S }: Lms): number {
  return L !== 0 ? (Math.pow(x / M, L) - 1) / (L * S) : Math.log(x / M) / S
}
export function lmsValueAtZ(z: number, { L, M, S }: Lms): number {
  return L !== 0 ? M * Math.pow(1 + L * S * z, 1 / L) : M * Math.exp(S * z)
}
// P3/P50/P97 lines: evaluate lmsValueAtZ at z = -1.881, 0, +1.881 for each age row
```

## Runtime State Inventory

> Not a rename/refactor/migration phase — this is greenfield (new table + new module + new static assets). No existing runtime state is renamed or migrated. The scalar `patients.weight/height/head_circumference` are explicitly left untouched (D-08). **None — verified against CONTEXT.md D-08 and STRUCTURE.md (no existing `patient_measurements` / `patient-growth` code).**

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x needs `react-is` override for React 19 | Recharts 3.x lists react ^19 in peer deps | Recharts 3.0 (2025) | Clean install under React 19 |
| Shipping pre-computed percentile tables | Ship LMS (L,M,S) + compute z/centiles at runtime | Long-standing WHO/CDC practice | Smaller data, exact percentile for any measurement |

**Deprecated/outdated:**
- WHO's old `who.int/childgrowth/standards/*.txt` URLs (surfaced by search) are legacy; current canonical entry is `who.int/tools/child-growth-standards`. `[CITED: who.int]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Clinical Intergrowth→WHO transition happens at term-corrected (PMA 40wk / corrected age 0); switch fully to WHO after term | Corrected Age | Wrong reference band for early-infancy preterm plotting — confirm with physician |
| A2 | Intergrowth-21st publishes machine-readable LMS/percentile tables downloadable from intergrowth21.com | Reference Datasets | May require manual extraction from published figures/appendices; could add ingestion effort |
| A3 | Brazilian PT-BR classification wording (eutrófico/sobrepeso/obesidade) and WHO z-cutoffs (−2/+1/+2) match the physician's expected labels | Positioning/Classification | Wrong clinical labels; confirm with physician |
| A4 | Monthly-granularity LMS tables (vs daily) are acceptable clinical precision for the on-screen MVP curve | Reference Datasets | If daily precision required, ~30× more rows (still small); interpolation between months mitigates |
| A5 | WHO weight-for-age ceiling ~10y, height/BMI to 19y, head-circ to 5y (per D-03 clinical note) | Reference Datasets | Curve drawn past a ceiling would extrapolate invalidly — enforce `ageMax` per file |

**Physician-confirmation items (STATE.md blocker):** A1, A2, A3, A5 are all content/accuracy items the STATE.md Phase 3 blocker flags ("verify data/source with the physician at build time"). Planner should add a `checkpoint:human-verify` on the reference dataset before it feeds the clinical curve.

## Open Questions

1. **Intergrowth-21st data availability & license**
   - What we know: It is the accepted preterm/newborn reference; site is intergrowth21.com.
   - What's unclear: Whether LMS tables are downloadable in a machine-readable form and redistribution terms.
   - Recommendation: Phase Intergrowth LAST (after the 4 WHO curves land); MVP can ship WHO-only curves with corrected-age points and add Intergrowth as a follow-up slice if data extraction is heavy.

2. **Percentile display for out-of-range measurements**
   - What we know: LMS gives z for any value; extreme z (>+3 / <−3) is common in NICU graduates.
   - Recommendation: Clamp the drawn reference band to z ±3 but still label the child's exact z; show "> P97" / "< P3" text.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `recharts` (npm) | GROWTH-02 chart | ✗ (to install) | target `3.9.0` | visx / hand-rolled SVG (higher effort) |
| `date-fns` | age derivation | ✓ | ^4.1.0 | — |
| `zod`, `react-hook-form` | measurement form | ✓ | installed | — |
| WHO LMS reference data | GROWTH-02 | ✗ (content to ingest) | n/a | per-indicator phasing; ship weight-for-age first |
| Supabase (migration apply) | GROWTH-01 | ✓ (project) | — | — |

**Missing dependencies with no fallback:** WHO reference LMS data must be ingested (content task; STATE.md blocker) — no automatic fallback, but phaseable.
**Missing dependencies with fallback:** `recharts` (fallback visx/SVG if a React-19 issue surfaces).

## Validation Architecture

> `.planning/config.json` not present / key absent → nyquist_validation treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `tsx --test` (Node built-in test runner) |
| Config file | none — `yarn test` = `tsx --test` globbing `*.spec.ts` in `modules/` + `lib/` |
| Quick run command | `yarn test` |
| Full suite command | `yarn test && yarn typecheck` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GROWTH-03 | LMS z-score + centile-line math correct vs WHO published values | unit | `yarn test` (lib/lms-zscore.spec.ts) | ❌ Wave 0 |
| GROWTH-03 | Corrected age extends to 36m; default still 24m | unit | `yarn test` (lib/compute-pediatric-age.spec.ts) | ✅ extend existing |
| GROWTH-01 | create/update/delete measurement enforce `profile_id`+`patient_id` ownership | unit | `yarn test` (modules/patient-growth/*.spec.ts) | ❌ Wave 0 |
| GROWTH-01 | BMI derived only when weight+height present | unit | `yarn test` | ❌ Wave 0 |
| GROWTH-02 | reference table metadata (source, ageMin/Max) present per file | unit | `yarn test` (lib/growth-reference/index.spec.ts) | ❌ Wave 0 |
| GROWTH-02 | chart renders reference + patient points | manual-only | UAT | n/a (no component tests in repo) |

### Sampling Rate
- **Per task commit:** `yarn test`
- **Per wave merge:** `yarn test && yarn typecheck`
- **Phase gate:** full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/lms-zscore.spec.ts` — LMS math vs WHO reference values (P50==M spot-check) — GROWTH-03
- [ ] `modules/patient-growth/*.spec.ts` — ownership filters (IDOR guard) — GROWTH-01/03
- [ ] `lib/growth-reference/index.spec.ts` — table lookup + metadata — GROWTH-02
- [ ] Extend `lib/compute-pediatric-age.spec.ts` — 36m cutoff + 24m default regression — GROWTH-03

## Security Domain

> `security_enforcement` treated as enabled.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getAuthenticatedUser(supabase)` in every action (existing) |
| V3 Session Management | yes (inherited) | Supabase SSR cookie session + `proxy.ts` (existing) |
| V4 Access Control | **yes (critical)** | `paid` gate + explicit `profile_id`+`patient_id` filter on every read/write/delete (D-14); RLS on new table |
| V5 Input Validation | yes | Zod `safeParse` at action boundary; numeric range checks (plausible weight/height/head-circ); date validity |
| V6 Cryptography | no | no new crypto |

### Known Threat Patterns for Next.js 16 + Supabase (no table RLS by default)
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on measurement update/delete by UUID (documented existing bug class) | Elevation/Tampering | `.eq("profile_id", profileId).eq("patient_id", patientId)` on every mutating query + RLS + ownership unit test |
| Cross-tenant read of another patient's history | Information disclosure | scope select by `profile_id`+`patient_id`; RLS policy keyed to `auth.uid()` |
| Missing `paid` gate on new action | Elevation | copy the established action preamble; lint/checklist |
| Unvalidated numeric input (negative/absurd weight) | Tampering | Zod min/max (e.g. weight 0.3–180 kg, height 20–220 cm, head-circ 20–70 cm) |
| Sensitive minor data (measurements) | Info disclosure (LGPD) | same private-scoping posture as Phase 2 photos; no public exposure |

## Sources

### Primary (HIGH confidence)
- `lib/compute-pediatric-age.ts` + `.spec.ts` (read directly) — corrected-age cutoff, date-safety patterns
- `supabase/migrations/20260604000002_rls_patients.sql` (read directly) — RLS policy pattern
- `.planning/codebase/CONCERNS.md` (read directly) — no-RLS / IDOR pitfalls
- `package.json` + `npm view recharts` (registry) — no chart lib present; recharts 3.9.2 / react ^19 peer

### Secondary (MEDIUM confidence)
- https://www.who.int/tools/child-growth-standards/standards — WHO 0–5 indicators
- https://www.who.int/tools/growth-reference-data-for-5to19-years — WHO 5–19 indicators
- https://metricgate.com/docs/growth-chart-lms-method/ + WHO computation.pdf — LMS z-score formula
- https://www.cdc.gov/growthcharts/who-data-files.htm — WHO-based LMS CSV distribution
- https://blog.logrocket.com/best-react-chart-libraries-2026/ — SSR chart-lib comparison

### Tertiary (LOW confidence)
- Intergrowth-21st machine-readable data format (A2) — not verified this session

## Metadata

**Confidence breakdown:**
- Standard stack (Recharts + LMS approach): MEDIUM-HIGH — registry-verified peer deps; SSR fit cited
- Reference data sourcing: MEDIUM — WHO indicators/LMS confirmed; Intergrowth format assumed (A2); accuracy is a physician-confirmation content task (STATE.md blocker)
- Corrected-age engine: HIGH — read the source; cutoff parameterization is a small, tested change
- Data model + security: HIGH — mirrors established migration/action/module patterns

**Research date:** 2026-07-09
**Valid until:** 2026-08-08 (30 days; Recharts is stable — re-verify if a Recharts 4.x lands)

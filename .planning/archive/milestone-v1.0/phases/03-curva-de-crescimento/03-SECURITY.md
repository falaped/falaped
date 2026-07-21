---
phase: 03-curva-de-crescimento
asvs_level: 1
block_on: high
threats_total: 17
threats_closed: 17
threats_open: 0
verdict: SECURED
audited_at: 2026-07-09
---

# Security Audit — Phase 03 (curva-de-crescimento)

Retroactive verification that every declared threat mitigation in the four PLAN.md
STRIDE registers is present in the implemented code. Implementation files were read
only; no implementation was modified. ASVS L1 (mitigation present in cited file),
with L2-level boundary checks applied to the IDOR/gate threats.

## Verdict: SECURED — 17/17 threats closed, 0 open

No blocking-open threats (`block_on: high`). No unregistered attack surface: none of
the four SUMMARY.md files contain a `## Threat Flags` section, and no new external
entry point appeared outside the registered threats.

## Threat Verification

| Threat ID | Category | Severity | Disposition | Status | Evidence |
|-----------|----------|----------|-------------|--------|----------|
| T-03-01 | Elevation/Tampering (IDOR) | high | mitigate | CLOSED | `modules/patient-growth/get-measurements-by-patient.ts:19-20` `.eq("profile_id").eq("patient_id")`; `create-measurement.ts:20-25` insert writes both scopes; RLS in `supabase/migrations/20260709000000_patient_measurements.sql:48-85`; ownership test `create-measurement.spec.ts:50-55` |
| T-03-02 | Information disclosure | high | mitigate | CLOSED | Scoped select `get-measurements-by-patient.ts:19-20`; RLS SELECT policy keyed to `auth.uid()` via profiles subquery `migration:50-56` |
| T-03-03 | Elevation (missing gate) | high | mitigate | CLOSED | `actions/patient-growth/create-measurement.ts:35-39` `getAuthenticatedUser` + `profile.status !== "paid"` preamble |
| T-03-04 | Tampering (bad input) | medium | mitigate | CLOSED | `lib/schemas/patient-measurement.ts:67-77` ranges (weight 0.3–180, height 20–220, HC 20–70); `:52-61` non-future `.refine`; `:79-88` at-least-one refine; CHECK constraint `migration:16-20` |
| T-03-05 | Information disclosure (LGPD, minor data) | medium | accept | CLOSED | Accepted risk logged below (AR-1) |
| T-03-06 | Tampering (WHO data integrity) | high | mitigate | CLOSED | Source cdn.who.int per checkpoint (03-02-PLAN checkpoint + 03-02-SUMMARY frontmatter); spot-check P50==M + published P3/P97 `lib/lms-zscore.spec.ts:15-26`, `lib/growth-reference/index.spec.ts:66-73`; source/version/range in every JSON + rendered `growth-chart.tsx:383-391` |
| T-03-07 | Information disclosure (client render) | medium | accept | CLOSED | Accepted risk logged below (AR-2) |
| T-03-08 | Tampering (past-ceiling extrapolation) | low | mitigate | CLOSED | Bands bounded to z±3: percentile view `PERCENTILE_Z_MAP` (max ±1.881) `lib/lms-zscore.ts:58-64`, z view `Z_LINES = [-3..+3]` `growth-chart.tsx:49`; points respect ageMax via `if (activeMonths < ageMin || activeMonths > ageMax) continue` `growth-chart.tsx:245` |
| T-03-09 | Elevation/Tampering (IDOR mutation) | high | mitigate | CLOSED | `modules/patient-growth/update-measurement.ts:34-36` and `delete-measurement.ts:19-21` `.eq("id").eq("profile_id").eq("patient_id")` (never id alone); RLS `migration:66-85`; ownership tests `delete-measurement.spec.ts:57-88`, `update-measurement.spec.ts:81-118` |
| T-03-10 | Elevation (missing gate mutation) | high | mitigate | CLOSED | `actions/patient-growth/update-measurement.ts:36-40` and `delete-measurement.ts:29-33` paid-gate preamble verbatim |
| T-03-11 | Tampering (bad edit) | medium | mitigate | CLOSED | `lib/schemas/patient-measurement.ts:102-128` `updateMeasurementSchema` reuses `measuredOnField` + `optionalAnthropometric` ranges + at-least-one refine |
| T-03-12 | Repudiation (accidental delete) | low | mitigate | CLOSED | `remove-measurement-dialog.tsx:49-57` AlertDialog with "Esta ação não pode ser desfeita." destructive confirm |
| T-03-13 | Tampering (Intergrowth data integrity) | high | mitigate | CLOSED | Source intergrowth21.com per checkpoint (03-04-PLAN + 03-04-SUMMARY frontmatter, Villar 2015); P50==M spot-check `lib/growth-reference/index.spec.ts:128-143`; source/version/range in all 6 JSON + rendered per-segment caption `growth-chart.tsx:378-382` |
| T-03-14 | Repudiation/License (Intergrowth redistribution) | medium | mitigate | CLOSED | Redistribution approved at blocking-human checkpoint (03-04-PLAN Task 1 checkpoint; 03-04-SUMMARY `intergrowth-source.redistribution`); citation in every JSON `source`/`version` metadata |
| T-03-15 | Information disclosure (client render, preterm) | medium | accept | CLOSED | Accepted risk logged below (AR-3) |
| T-03-16 | Tampering (past-ceiling preterm band) | low | mitigate | CLOSED | Intergrowth ageMin/ageMax respected: rows filtered `growth-chart.tsx:206-207`, domain `:163-164`, point clamp `:245`; bands bounded z±3 (same as T-03-08) |
| T-03-SC | Supply chain (recharts install) | high (03-02) | mitigate | CLOSED | Blocking-human checkpoint before install (03-02-PLAN Task checkpoint); exact pin `package.json:44` `"recharts": "3.9.0"`; verified no postinstall (`node_modules/recharts/package.json` scripts.postinstall none) and peer react includes `^19.0.0` |

## Accepted Risks Log

### AR-1 — T-03-05: Anthropometric measurement is sensitive minor data (LGPD)
- **Severity:** medium | **Disposition:** accept
- **Rationale:** Consistent with the app's private-scoping posture. Measurements are
  read/written only through profile_id + patient_id owner-scoped modules behind the
  paid gate, with RLS keyed to `auth.uid()`. No public exposure and no new output
  channel introduced by this phase.
- **Accepted by:** phase owner (plan-time disposition, 03-01-PLAN threat_model).

### AR-2 — T-03-07: Minor's curve rendered client-side (WHO chart)
- **Severity:** medium | **Disposition:** accept
- **Rationale:** The chart is a client component but consumes measurement data already
  scoped server-side (03-01 `getMeasurementsByPatient`). Reference bands are public
  read-only content. No new output channel; no public exposure.
- **Accepted by:** phase owner (plan-time disposition, 03-02-PLAN threat_model).

### AR-3 — T-03-15: Minor's curve rendered client-side (Intergrowth preterm band)
- **Severity:** medium | **Disposition:** accept
- **Rationale:** Same posture as AR-2 (T-03-07). The preterm band is client-side over
  server-scoped measurements plus read-only reference data. No new output channel.
- **Accepted by:** phase owner (plan-time disposition, 03-04-PLAN threat_model).

## Unregistered Flags

None. No SUMMARY.md declares a `## Threat Flags` section, and no attack surface
appeared during implementation without a mapped threat ID.

## Notes / Defense-in-Depth Observations

- IDOR mitigation is dual-layer: application-layer triple `.eq` scope in every mutation
  and read, plus RLS policies on the table (defense-in-depth). Both verified.
- The paid-gate preamble is present verbatim in all three actions (create/update/delete).
- Data-integrity threats (T-03-06/T-03-13) are the highest-consequence in this phase
  (a wrong curve is a clinical hazard). Verified two ways: (a) plan-time human-verify
  checkpoints confirming canonical source + redistribution terms, and (b) automated
  spot-checks in specs that cross-check ingested medians and z-lines against published
  WHO/Intergrowth values — not merely structural `P50==M`.
- Growth test suites re-run at audit time: 39/39 pass across
  `modules/patient-growth/*.spec.ts`, `lib/lms-zscore.spec.ts`,
  `lib/growth-reference/{index,preterm-transition}.spec.ts`, `lib/growth-classification.spec.ts`.

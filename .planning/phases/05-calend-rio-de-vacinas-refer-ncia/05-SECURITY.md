---
phase: 05-calend-rio-de-vacinas-refer-ncia
audited: 2026-07-19
asvs_level: 1
block_on: high
threats_total: 11
threats_closed: 11
threats_open: 0
unregistered_flags: 0
status: secured
mode: hybrid (plan-time register verified + retroactive VAC-05 surface)
---

# Phase 05 — Security Audit (Calendário de vacinas / referência)

**ASVS Level:** 1 (verify mitigation is PRESENT at cited location)
**block_on:** high — only OPEN threats of severity ≥ high count toward `threats_open`.
**Result:** SECURED — 11/11 threats CLOSED, 0 open, 0 unregistered flags.

This is a hybrid audit. The four `05-0X-PLAN.md` files carry `<threat_model>` blocks (plan-time register T-05-01/02/04/05/SC), verified against the implementation below. Significant functionality (the owned `patient_vaccine_doses` table + `togglePatientVaccineDoseAction` write path, VAC-05, pulled forward from Phase 6) was added AFTER planning and is NOT in the plan-time threat models. A retroactive STRIDE register (VAC-05-01..06) was built and verified for that new surface — the highest-value area of this audit.

---

## Plan-time threat register (verified)

| Threat ID | Category | Severity | Disposition | Status | Evidence |
|-----------|----------|----------|-------------|--------|----------|
| T-05-01 | Elevation of Privilege | high | mitigate | CLOSED | `app/dashboard/vaccines/page.tsx:20-24` — `getAuthenticatedUser(supabase)` + `if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")`. Paid gate is an app-layer rule (RLS `to authenticated` does not enforce tier). |
| T-05-02 | Tampering (reference tables) | high | mitigate | CLOSED | `supabase/migrations/20260720000100_rls_vaccine_schedules.sql:14-25` — RLS enabled on both reference tables; ONLY SELECT policies (`using (true)`), NO insert/update/delete policy. Grep confirms no `create policy`/`for insert|update|delete` in the RLS or the three seed migrations. Grep confirms NO client-reachable write (`insert\|update\|delete\|upsert`) to `vaccine_schedules`/`vaccine_schedule_items` anywhere under `actions/ modules/ app/ lib/ components/`. |
| T-05-04 | Tampering / Safety (seed clinical content) | medium | mitigate | CLOSED | Seed values physician-verified behind blocking `checkpoint:human-verify` (recorded across 05-01/02/03 SUMMARY + REVIEW); fixed advisory "Confira sempre contra o calendário oficial atual." + per-dataset provenance render (`components/dashboard/vaccines/schedule-provenance.tsx`). Below block_on threshold regardless. |
| T-05-05 | Information Disclosure (IDOR — `?patientId` read) | high | mitigate | CLOSED | `app/dashboard/vaccines/page.tsx:31-33` — patient read via `getPatientById(supabase, patientId, profile.id)`; module (`modules/patients/get-patient-by-id.ts:16-28`) filters `.eq("id", id).eq("profile_id", profileId).maybeSingle()` → foreign/guessed id resolves to `null` (renders standalone, no leak). |
| T-05-SC | Tampering (supply chain) | high | mitigate | CLOSED | No packages installed this phase (RESEARCH §Package Legitimacy Audit N/A; SUMMARYs confirm zero installs). No new dependency to legitimacy-gate. |

## New VAC-05 surface — retroactive STRIDE register (verified)

Attack surface added after planning: owned table `public.patient_vaccine_doses` (per-patient clinical data, `profile_id` + `patient_id`) and a CLIENT-REACHABLE write path `togglePatientVaccineDoseAction` (imported by `components/dashboard/patients/patient-vaccine-calendar-section.tsx`).

| Threat ID | Category | Severity | Disposition | Status | Evidence |
|-----------|----------|----------|-------------|--------|----------|
| VAC-05-01 | Information Disclosure / Tampering (IDOR cross-tenant WRITE) | high | mitigate | CLOSED | Defense in depth at 3 layers. (1) Action `actions/patient-vaccine-doses/toggle-patient-vaccine-dose.ts:53-54` verifies patient ownership via `getPatientById(supabase, patientId, profile.id)` and returns "Paciente não encontrado." if `null` — a dose on doctor B's patient never reaches the mutation. (2) `markDoseTaken` (`modules/patient-vaccine-doses/mark-dose-taken.ts:24-36`) stamps `profile_id` on the row (RLS `with check` enforces it belongs to caller); `unmarkDoseTaken` (`unmark-dose-taken.ts:23-29`) deletes scoped by ALL THREE of `profile_id` + `patient_id` + `schedule_item_id`, never item alone. (3) RLS owner policies (see VAC-05-05). |
| VAC-05-02 | Information Disclosure (IDOR READ) | high | mitigate | CLOSED | `modules/patient-vaccine-doses/get-taken-dose-ids-by-patient.ts:21-26` — SELECT scoped by `.eq("profile_id", profileId).eq("patient_id", patientId)`. Call site `components/dashboard/patients/patient-detail-content.tsx:73` passes `profile.id` (authenticated) + `patient.id` from an owner-scoped `getPatientById(supabase, id, profile.id)` that `notFound()`s on ownership mismatch (`patient-detail-content.tsx:17-22`). |
| VAC-05-03 | Elevation of Privilege (auth + paid gate on write action) | high | mitigate | CLOSED | `toggle-patient-vaccine-dose.ts:35-41` — `getAuthenticatedUser(supabase)`; `if (!profile)` reject; `if (profile.status !== "paid")` reject. Unauthenticated path also rejected: `getAuthenticatedUser` returns `{}` on no session → `status` is undefined → `undefined !== "paid"` → rejected. |
| VAC-05-04 | Tampering (input validation) | medium | mitigate | CLOSED | `lib/schemas/patient-vaccine-dose.ts:8-12` — zod `patientId: z.string().uuid()`, `scheduleItemId: z.string().uuid()`, `taken: z.boolean()`. Action `safeParse` at boundary (`toggle-...ts:43-47`) before any DB access. |
| VAC-05-05 | Tampering / IDOR (RLS defense-in-depth) | high | mitigate | CLOSED | `supabase/migrations/20260720000500_patient_vaccine_doses.sql:37-74` — RLS enabled; 4 owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) with expression `profile_id in (select id from public.profiles where auth_user_id = auth.uid())`, mirroring `patient_measurements`. Orchestrator confirmed applied to live DB. `unique (profile_id, patient_id, schedule_item_id)` + `on delete cascade` FKs to `profiles`/`patients`/`vaccine_schedule_items`. |
| VAC-05-06 | Information Disclosure (patient-aware route owner-scope) | high | mitigate | CLOSED | Same mitigation as T-05-05: `app/dashboard/vaccines/page.tsx:31-33` owner-scoped `getPatientById`. A foreign `?patientId` leaks nothing (resolves `null` → standalone). |

**All 11 threats CLOSED.** `threats_open = 0`.

## Deliberate divergence (D-07) — NOT flagged (verified correct)

The reference tables `vaccine_schedules` / `vaccine_schedule_items` intentionally have NO `profile_id`, RLS `using (true)` for `authenticated`, and NO write policies — documented decision D-07 for non-sensitive global public vaccine schedules. Confirmed correct and intentional; not a finding. The divergence-abuse conditions were checked and are ABSENT:
- No client-reachable WRITE path to the reference tables exists (grep over `actions/ modules/ app/ lib/ components/` for insert/update/delete/upsert on those tables → 0 matches; seed migrations carry no write policies).
- The global read exposes only non-sensitive schedule data (no owned/patient columns on those tables). Owned per-patient data lives in the separately owner-scoped `patient_vaccine_doses`.

## Unregistered flags

None. `05-04-SUMMARY.md` `## Threat Surface` explicitly states "No new security surface beyond the plan's threat_model" and maps VAC-05 additions to T-05-05 (IDOR) / T-05-01 (paid gate) / T-05-SC. The new `patient_vaccine_doses` write path was audited here as the retroactive VAC-05-01..06 register and fully closed — no unmapped surface remains.

## Notes / non-blocking observations (out of security scope)

- The code review (`05-REVIEW.md`) blocker CR-01 (corrected-age highlight) is a CORRECTNESS bug, RESOLVED (`8f4a4d7`), not a security threat — no confidentiality/integrity/availability impact. WR-01..04 are robustness/quality (graceful degradation, band-overlap, ordering) — none is a security mitigation gap. Recorded for completeness; none affects `threats_open`.

## Accepted risks log

None. No threat required an accepted-risk disposition this phase.

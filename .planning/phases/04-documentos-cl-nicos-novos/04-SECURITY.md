---
phase: 04
phase_name: Documentos Clínicos Novos
asvs_level: 1
block_on: high
threats_total: 24
threats_closed: 24
threats_open: 0
verdict: SECURED
audited_at: 2026-07-19
---

# Phase 04 — Security Audit (Documentos Clínicos Novos)

Retroactive verification of the STRIDE registers (T-04-01..T-04-24) declared in the five
04-0{1..5}-PLAN.md `<threat_model>` blocks. Each threat verified against implemented code
(ASVS L1: mitigation present at the cited boundary). Implementation files were NOT modified.

**Verdict: SECURED — 24/24 threats CLOSED. 0 blocking-open, 0 non-blocking-open.**

## Threat Verification

| Threat ID | Category | Severity | Disposition | Status | Evidence |
|-----------|----------|----------|-------------|--------|----------|
| T-04-01 | Elevation of Privilege | high | mitigate | CLOSED | `modules/referrals/delete-referral.ts:19-20` + `delete-referrals-bulk.ts:21-22` scope `.eq("id").eq("profile_id")`; `app/api/referrals/[id]/download/route.ts:27-28`; cross-tenant no-op proven `delete-referral.spec.ts:32-35`; RLS `20260710000100_rls_referrals.sql:7` |
| T-04-02 | Elevation of Privilege | high | mitigate | CLOSED | `actions/referrals/generate-referral.ts:44-46` (auth + `status !== "paid"`); template actions `referral-templates/create:33-35`,`delete:17-19` |
| T-04-03 | Information Disclosure | high | mitigate | CLOSED | `20260710000200_storage_referrals.sql:6` (`public = false`) + `foldername[1]` policy `:12-13`; signed URL 60s `download/route.ts:5,47` |
| T-04-04 | Tampering | medium | mitigate | CLOSED | urgency enum `lib/schemas/referral.ts:11` (`z.enum([...])`); Zod `safeParse` at boundary `generate-referral.ts:52`; insert scoped `profile_id` + FK + RLS |
| T-04-05 | Info Disclosure (logs) | medium | mitigate | CLOSED | All throws/logs domain-tagged `[REFERRALS]`; no payload content embedded (grep audit clean) |
| T-04-06 | Tampering (service-role) | low | accept | CLOSED (accepted) | User-scoped `createClient()` used in delete path; no admin/service-role client in domain. See Accepted Risks. |
| T-04-07 | Elevation of Privilege | high | mitigate | CLOSED | `modules/medical-reports/delete-medical-report.ts:19-20` + bulk `:21-22`; `app/api/medical-reports/[id]/download/route.ts:27-28`; `delete-medical-report.spec.ts:32-35`; RLS `20260710010100:7` |
| T-04-08 | Elevation of Privilege | high | mitigate | CLOSED | `actions/medical-reports/generate-medical-report.ts:44-46`; template actions `medical-report-templates/create:29-31`,`delete:17-19` |
| T-04-09 | Tampering (XSS via TipTap HTML) | high | mitigate | CLOSED | `modules/medical-reports/generate-medical-report-pdf.ts:36` converts body via `htmlToPlainTextForPdf(payload.bodyHtml)`; no `dangerouslySetInnerHTML` of raw payload in new doc components (grep clean) |
| T-04-10 | Information Disclosure | high | mitigate | CLOSED | `20260710010200_storage_medical_reports.sql:6` (`public = false`) + `foldername[1]:12-13`; signed URL 60s |
| T-04-11 | Info Disclosure (logs) | medium | mitigate | CLOSED | Domain-tagged `[MEDICAL_REPORTS]`; no payload in logs |
| T-04-12 | Elevation of Privilege | high | mitigate | CLOSED | `modules/exam-requests/delete-exam-request.ts:19-20` + bulk `:21-22`; `modules/exam-panels/delete-exam-panel.ts:15-16`; `app/api/exam-requests/[id]/download/route.ts:30-31`; `delete-exam-request.spec.ts:32-35`; RLS `20260710020100:7` |
| T-04-13 | Elevation of Privilege | high | mitigate | CLOSED | `actions/exam-requests/generate-exam-request.ts:44-46`; `actions/exam-panels/create:25-27`,`delete:14-16`; `exam-request-templates/create:31-33`,`delete:17-19` |
| T-04-14 | Information Disclosure | high | mitigate | CLOSED | `20260710020200_storage_exam_requests.sql:6` + `foldername[1]`; catalog RLS `20260710020400:28-34`; panels RLS `20260710020500:29-35` (per-profile) |
| T-04-15 | Tampering (fabricated seed) | high | mitigate | CLOSED | Blocking-human checkpoint `04-03-PLAN.md:142-152` (gate=blocking-human, never auto-approvable); doctor-APPROVED per `04-03-SUMMARY.md:29,96,120`; seed `20260710020600_seed_exam_catalog.sql` contains only approved content |
| T-04-16 | Tampering (self-contained payload) | medium | mitigate | CLOSED | `modules/exam-requests/types.ts:5` stores `exams: string[]` (resolved strings, not catalog ids) |
| T-04-17 | Info Disclosure (logs) | medium | mitigate | CLOSED | Domain-tagged `[EXAM_REQUESTS]`; no payload in logs |
| T-04-18 | Elevation of Privilege | high | mitigate | CLOSED | `modules/guidance/delete-guidance-document.ts:19-20`, `delete-guidance-template.ts:14-15`, `update-guidance-template.ts:28-29`; `app/api/guidance/[id]/download/route.ts:30-31`; `delete-guidance-document.spec.ts:32-35`; RLS `20260710030300:7` |
| T-04-19 | Elevation of Privilege | high | mitigate | CLOSED | `actions/guidance/generate-guidance.ts:44-46`; library actions `create-guidance-template:19-21`, `update-guidance-template:20-22`, `delete-guidance-template:16-18`, `delete-guidance-document:17-19` |
| T-04-20 | Information Disclosure | high | mitigate | CLOSED | `20260710030400_storage_guidance_documents.sql:6` + `foldername[1]`; library RLS `20260710030000_guidance_templates.sql:35-41` (per-profile) |
| T-04-21 | Tampering (fabricated seed) | high | mitigate | CLOSED | Blocking-human checkpoint `04-04-PLAN.md:126-128`; doctor-APPROVED (exactly 10 marco→texto pairs) per `04-04-SUMMARY.md:88-90`; seed header `20260710030100_seed_guidance_templates.sql:1-5` attests executor did not author content |
| T-04-22 | Info Disclosure (logs) | medium | mitigate | CLOSED | Domain-tagged `[GUIDANCE]`; no payload in logs |
| T-04-23 | Elevation of Privilege (prescription paid gate) | high | mitigate | CLOSED | **Gap closed in 04-05:** `actions/prescriptions/generate-prescription.ts:44-46` now carries auth + `status !== "paid"` gate; inherits existing `profile_id` scope; Zod `safeParse:49`; download routes also gate (exam/guidance add `status !== "paid"` at `:23-25`) |
| T-04-24 | Tampering (blankMode regression) | medium | mitigate | CLOSED | `blankMode = false` default `components/dashboard/prescriptions/prescription-wizard.tsx:109`; min-1-medication guard skipped only under blankMode `:320`; server schema `lib/schemas/prescription.ts:16` still requires `medications.min(1)` — normal path unchanged; auth/scope untouched |

## Unregistered Flags

None. No `## Threat Flags` section present in any of the five 04-0{1..5}-SUMMARY.md files; no new
attack surface was reported by the executor during implementation. All implemented surface maps to a
registered threat.

## Accepted Risks Log

| Threat ID | Risk | Rationale | Owner |
|-----------|------|-----------|-------|
| T-04-06 | Service-role/admin client theoretically bypasses RLS in delete path | Delete path uses the per-request user-scoped `createClient()` (repo standard); no admin/service-role client is constructed in the referrals delete flow, so the risk does not materialize. Severity: low (below `high` block threshold). | Filipe Prado |

## Cross-Cutting Verification Notes

- **IDOR / EoP (T-04-01/07/12/18 + exam-panels):** Every delete, bulk-delete, and download entry
  point across all four doc domains scopes `.eq("id",…).eq("profile_id", …)` with `profile.id`
  threaded from the action. Each domain ships a `delete-*.spec.ts` proving cross-tenant delete is a
  0-row no-op (not an error). Table RLS + storage RLS act as defense-in-depth backstops.
- **Paid gate (T-04-02/08/13/19/23):** All 5 generate actions, all template create/delete actions,
  both exam-panel actions, and `generatePrescriptionAction` carry the
  `getAuthenticatedUser` + `profile.status !== "paid"` preamble. The prescription gap flagged in
  T-04-23 is confirmed closed. Exam-request and guidance download routes additionally enforce the
  paid gate at the route handler.
- **Info disclosure (T-04-03/10/14/20):** All four buckets are private (`public = false`) with
  storage RLS keyed to `foldername[1] = profile id`; downloads use 60s signed URLs. Per-profile
  catalog, panels, and guidance library are RLS-scoped by `profile_id`.
- **Zod at boundary (T-04-04/16/24):** Every generate action runs `Schema.safeParse(...)` before
  delegating to modules.

## Result

All 24 registered threats are CLOSED with code evidence. `threats_open: 0`. Phase 04 passes the
security gate (`block_on: high`).

# Codebase Concerns

**Analysis Date:** 2026-06-04

## Security Considerations

### No Row Level Security (RLS) on data tables

- Risk: All data isolation between doctors (profiles) depends entirely on the application layer adding `profile_id` / `user_phone` filters to every query. A single missing filter (see IDOR below) exposes or destroys another user's data. RLS is the standard defense-in-depth backstop for Supabase apps and it is absent.
- Files: `supabase/migrations/20260315000000_prescriptions.sql`, `supabase/migrations/20260301100000_case_reports.sql`, `supabase/migrations/20260314000000_medical_certificates.sql`, `supabase/migrations/20260228120000_profiles_and_authenticated_users_phase1.sql`, all other table-creating migrations
- Current mitigation: None on data tables. Only storage buckets have RLS (`supabase/migrations/20260315010000_storage_prescriptions.sql`, `20260314010000_storage_medical_certificates.sql`, `20260228200000_storage_profile_logos_rls.sql`). No migration contains `enable row level security` for `prescriptions`, `medical_certificates`, `cases`, `patients`, `case_messages`, `case_reports`, `prescription_templates`, or `report_templates`.
- Recommendations: Enable RLS on every `public` data table and add `using`/`with check` policies keyed to the authenticated user's `profile_id` (or `user_phone` for case-scoped tables). Until then, treat the IDOR finding below as actively exploitable, because no database-layer check stops a forged ID.

### IDOR: prescription/certificate deletes do not filter by owner

- Risk: `deletePrescription` and `deleteMedicalCertificate` delete by `id` only — there is no `.eq("profile_id", ...)` ownership check. The doc comments claim "RLS ensures only the profile owner can delete," but RLS is not enabled (see above), so this protection does not exist. An authenticated doctor can delete another doctor's prescription/certificate (DB row + PDF) by supplying its UUID. Read paths (`app/api/prescriptions/[id]/download/route.ts`) correctly filter by `profile_id`, proving the delete omission is an inconsistency, not an intentional design.
- Files: `modules/prescriptions/delete-prescription.ts` (line 33: `.delete().eq("id", prescriptionId)`), `modules/medical-certificates/delete-medical-certificate.ts` (line 33), `actions/prescriptions/delete-prescription.ts`, `actions/prescriptions/delete-prescriptions-bulk.ts`, `actions/medical-certificates/delete-medical-certificate.ts`, `actions/medical-certificates/delete-medical-certificates-bulk.ts`
- Trigger: Call the delete server action with a UUID belonging to another profile. The action checks that *a* session exists (`profile?.id`) but never passes `profile.id` into the delete query.
- Current mitigation: None effective. Worse, the bulk action passes the **service-role admin client** (`createAdminClient()`) as `storageClient`, which also bypasses storage-bucket RLS for the PDF deletion.
- Recommendations: Add `.eq("profile_id", profileId)` to both delete queries and thread `profile.id` from the actions into the module functions; additionally enable table RLS as defense-in-depth.

### Service-role key used in user-triggered delete paths

- Risk: `createAdminClient()` (full service-role key, bypasses all RLS) is instantiated inside delete server actions to remove storage objects. Combined with the missing ownership filter, this widens the IDOR blast radius and means a logic bug here operates with god-mode privileges.
- Files: `lib/supabase/server-admin.ts`, `actions/prescriptions/delete-prescription.ts`, `actions/prescriptions/delete-prescriptions-bulk.ts`, `actions/medical-certificates/delete-medical-certificate.ts`, `actions/medical-certificates/delete-medical-certificates-bulk.ts`, `actions/profile/delete-account.ts`
- Current mitigation: Admin client is server-only and gated behind `getAuthenticatedUser`; key is never sent to the browser. The `auth: { persistSession: false }` flag is set.
- Recommendations: Prefer user-scoped storage RLS policies so the normal user client can delete its own objects, reserving the admin client strictly for `auth.admin.deleteUser` in account deletion. Never use the admin client on a query that lacks an explicit ownership filter.

## Tech Debt

### `lib/env.ts` validation bypassed by direct `process.env` access

- Issue: A Zod-validated `env` object exists (`lib/env.ts`) but is only imported by the Groq modules and two report actions. Supabase clients, proxy, and `app/layout.tsx` read `process.env.NEXT_PUBLIC_SUPABASE_URL!` / `...PUBLISHABLE_KEY!` directly with non-null assertions, sidestepping validation. Two sources of truth for "what env is required."
- Files: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `lib/supabase/server-admin.ts`, `lib/utils.ts`, `app/layout.tsx`, `modules/falaped-assistant/planning/extract-actions-by-llm.ts` (reads `process.env.GROQ_ASSISTANT_MODEL` directly while `lib/env.ts` already defaults it)
- Impact: Missing/invalid Supabase env vars produce runtime crashes with `!` rather than the friendly aggregated error from `lib/env.ts`. Model name default is duplicated in two places (`qwen/qwen3-32b`).
- Fix approach: Route all env reads through `lib/env.ts`; remove non-null assertions and the duplicated default.

### Duplicate Portuguese/English route directories

- Issue: Parallel `new` and `novo` route segments exist for several resources, indicating an incomplete EN<->PT migration; one set is likely dead/duplicate.
- Files: `app/dashboard/patients/new` + `app/dashboard/patients/novo`, `app/dashboard/prescriptions/new` + `app/dashboard/prescriptions/novo`, `app/dashboard/medical-certificates/new` + `app/dashboard/medical-certificates/novo`, `app/dashboard/report-templates/new` + `app/dashboard/report-templates/novo`
- Impact: Confusing navigation, doubled maintenance, risk of fixing a bug in the wrong copy.
- Fix approach: Pick one language convention (the codebase is mixed PT/EN), delete the unused segment, and add redirects if either URL is linked externally.

### Empty placeholder directories for an unfinished audio feature

- Issue: `app/api/consultation-audio/transcribe/` and `app/api/consultation-audio/presigned-upload/` are empty (no `route.ts`), and `modules/consultation-audio/` is an empty module directory. The audio capture flow is implemented client-side (`hooks/use-audio-recorder.ts`) and transcription goes through `modules/groq/transcribe-audio.ts` invoked from `components/dashboard/cases/new-case-workspace.tsx`, so these scaffolded API routes appear to be abandoned in-progress work.
- Files: `app/api/consultation-audio/transcribe/` (empty), `app/api/consultation-audio/presigned-upload/` (empty), `modules/consultation-audio/` (empty)
- Impact: Misleading structure; suggests a presigned-upload path that does not exist. New contributors may assume audio is uploaded via API routes.
- Fix approach: Remove the empty directories, or finish the presigned-upload route if large-audio direct-upload was the intent (current path posts audio through a 25mb server-action body limit — see Scaling Limits).

### Manual SQL file checked into migrations directory

- Issue: `supabase/migrations/run_prescriptions_manual.sql` is a hand-run script sitting alongside timestamped migrations. It is not a real migration and pollutes the migration history.
- Files: `supabase/migrations/run_prescriptions_manual.sql`
- Impact: Ambiguity about which files are authoritative migrations; risk of double-applying.
- Fix approach: Fold its contents into a proper timestamped migration or move it out of `supabase/migrations/`.

## Fragile Areas

### `actions/cases/send-case-assistant-message.ts` (662 lines)

- Files: `actions/cases/send-case-assistant-message.ts`
- Why fragile: Single server action orchestrating intent detection, the assistant turn queue, patient-profile updates, report/prescription/certificate generation, status changes, and a custom `__FALAPED_JSON__` payload-serialization protocol with a large `AssistantActionId` union and inline UUID regex. Many cross-module imports; one of the highest-blast-radius files in the app.
- Safe modification: Change behavior through the underlying modules (`modules/falaped-assistant/orchestrator/process-turn.ts`, `planning/`, `pipeline/`) which are unit-tested; keep the action thin. Preserve the `PAYLOAD_PREFIX` contract consumed by the client renderer.
- Test coverage: The action itself has no test; the assistant/groq modules it calls are well covered.

### Oversized client components (>800 lines)

- Files: `components/dashboard/cases/new-case-workspace.tsx` (1175), `components/dashboard/medical-certificates/medical-certificate-wizard.tsx` (1023), `app/dashboard/profile/profile-content.tsx` (842), `components/dashboard/prescriptions/prescription-wizard.tsx` (841), `components/dashboard/cases/case-report.tsx` (758)
- Why fragile: Large multi-step client components mixing recording, transcription, form state, and submission logic. High cognitive load; easy to introduce re-render or state-sync bugs.
- Safe modification: Extract step logic into hooks/subcomponents before adding features; lean on the existing `use-*` hooks pattern (`hooks/use-audio-recorder.ts`).
- Test coverage: No component tests anywhere in `components/`, `app/`, `actions/`, or `hooks/`.

### Silent `catch {}` blocks swallow errors without logging

- Issue: Multiple `catch {}` (no binding, no log) blocks silently discard failures. Some are benign (clipboard copy, formatter fallbacks), but several hide real failures in user-facing flows.
- Files: `components/dashboard/cases/new-case-workspace.tsx:170`, `app/dashboard/profile/profile-content.tsx:166`, `app/dashboard/link-whatsapp/link-whatsapp-content.tsx:89`, `actions/medical-certificates/generate-medical-certificate.ts:84` & `:152`, `actions/prescriptions/generate-prescription.ts:28` & `:76`, `modules/falaped-assistant/lib/thread-scanning.ts:44` & `:63`, `modules/falaped-assistant/assistant-model-message.ts:49`, `modules/groq/lib/parse-groq-json-reply.ts:16`, `lib/get-friendly-toast-message.ts:29`
- Impact: Failures in generation/parsing flows can pass unnoticed, producing confusing empty UI states without diagnostics.
- Fix approach: Bind the error and at minimum `console.error` with context in the generation/parsing paths; reserve bare `catch {}` for genuinely ignorable operations and comment why.

## Performance Bottlenecks

### Sequential awaits in bulk delete (no batching)

- Problem: `deletePrescriptionsBulkAction` deletes up to 100 prescriptions one-by-one in a `for` loop, each doing a storage `remove` + a DB `delete` round-trip serially.
- Files: `actions/prescriptions/delete-prescriptions-bulk.ts` (lines 50-57), `actions/medical-certificates/delete-medical-certificates-bulk.ts`, `modules/prescriptions/delete-prescription.ts`
- Cause: Per-item awaits instead of a single `.in("id", ids)` DB delete and a single batched `storage.remove([...paths])`.
- Improvement path: Batch the DB delete with `.delete().in("id", ids).eq("profile_id", profileId)` and remove all PDFs in one `storage.remove` call; this also fixes the partial-failure-on-iteration-N problem and the IDOR simultaneously.

## Test Coverage Gaps

### No tests outside `modules/` and `lib/`

- What's not tested: All server actions (`actions/`), all React components (`components/`, `app/`), and all hooks (`hooks/`) have zero tests. The `package.json` `test` script only globs `modules` and `lib` for `*.spec.ts`.
- Files: `actions/**`, `components/**`, `app/**`, `hooks/**` (0 spec files); contrast with 31 spec files concentrated in `modules/falaped-assistant`, `modules/groq`, and `lib`.
- Risk: The highest-risk code (server actions performing deletes with the admin client, the 662-line assistant orchestration action, the multi-step wizards) is entirely untested. The IDOR delete bug would have been caught by a single ownership test.
- Priority: High — add tests for delete/generate server actions (ownership enforcement, error paths) and for `actions/cases/send-case-assistant-message.ts` payload contract.

### Supabase query modules untested

- What's not tested: Data-access modules (`modules/patients`, `modules/cases`, `modules/prescriptions`, `modules/medical-certificates`, `modules/case-messages`) have almost no specs (only `patient-sex.spec.ts`), despite being the sole line of defense for tenant isolation given the absent RLS.
- Files: `modules/prescriptions/*.ts`, `modules/medical-certificates/*.ts`, `modules/cases/*.ts`, `modules/patients/*.ts`
- Risk: Ownership-filter regressions ship undetected.
- Priority: High while RLS is absent.

## Scaling Limits

### Audio upload bound by 25mb server-action body limit

- Current capacity: `next.config.ts` sets `serverActions.bodySizeLimit: "25mb"`. Consultation audio (`hooks/use-audio-recorder.ts`) is recorded in-browser and sent through a server action / Groq transcription, capped by `NEW_CASE_TRANSCRIPTION_MAX_DURATION_SECONDS`.
- Limit: Long consultations risk exceeding 25mb; webm at typical bitrates approaches this within minutes.
- Scaling path: Implement the scaffolded presigned-upload route (`app/api/consultation-audio/presigned-upload/`) so audio goes directly to storage, then transcribe from the stored object instead of through the action body.

## Dependencies at Risk

### `latest` and unpinned versions for critical packages

- Risk: `@supabase/ssr` and `@supabase/supabase-js` are pinned to `"latest"` in `package.json`. Auth/session and all data access depend on these; a breaking minor could ship on any `yarn install` without a lockfile-respecting CI.
- Impact: Non-reproducible auth/DB behavior; supply-chain and breaking-change exposure on the most security-sensitive dependency.
- Migration plan: Pin both Supabase packages to explicit semver ranges and rely on `yarn.lock` (present). Audit before bumping.

### Skill/docs reference `@tanstack/react-query` that is not installed

- Risk: The `dependency-stack` and `supabase-falaped` skills (`.cursor/skills/`) instruct contributors to use `@tanstack/react-query` for server state, but it is not in `package.json` dependencies. Data fetching is actually done via server components + server actions + `modules/`.
- Impact: Misleading guidance; a contributor may add react-query and a parallel data-fetching pattern, fragmenting the architecture.
- Migration plan: Update `.cursor/skills/dependency-stack/SKILL.md` and `supabase-falaped/SKILL.md` to reflect the actual server-component/server-action data pattern, or intentionally adopt react-query and install it.

### Next.js 16 / React 19 on bleeding-edge tooling

- Risk: `next@^16.2.0`, `react@^19.0.0`, `tailwindcss@^4.2.1`, and `cacheComponents: true` (experimental) are recent majors. `eslint-config-next` is pinned to `15.3.1` while Next is `16.x` — a version skew.
- Impact: Lint config may lag framework behavior; experimental `cacheComponents` and `serverActions` config can change semantics across patch releases.
- Migration plan: Align `eslint-config-next` with the installed Next major; track experimental-flag release notes before upgrades.

## Known Bugs

### Storage-failure aborts delete, leaving inconsistent state

- Symptoms: In `deletePrescription` / `deleteMedicalCertificate`, if `storage.remove` errors it `throw`s before the DB row is deleted — and in the bulk loop a failure on item N leaves items 1..N-1 deleted with no rollback and a generic toast.
- Files: `modules/prescriptions/delete-prescription.ts` (lines 15-29 throw before line 31 DB delete), `modules/medical-certificates/delete-medical-certificate.ts`, `actions/prescriptions/delete-prescriptions-bulk.ts`
- Trigger: Transient storage error or stale `pdf_storage_path`.
- Workaround: Retry; partial bulk deletes require manual reconciliation.

## Missing Critical Features

### Database-enforced tenant isolation (RLS)

- Problem: As detailed under Security, there is no row-level security; multi-tenant isolation is application-only.
- Blocks: Safe multi-tenant operation, and any future direct Supabase client access from the browser (which `lib/supabase/client.ts` enables) would be wide open.

---

*Concerns audit: 2026-06-04*

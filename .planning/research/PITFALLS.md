# Pitfalls Research

**Domain:** Medical SaaS — Supabase RLS retrofit, public share-links (LGPD), large component decomposition, CI on broken Yarn/corepack
**Researched:** 2026-06-04
**Confidence:** HIGH (codebase directly audited; Supabase pitfalls confirmed against Context7/official docs)

---

## Critical Pitfalls

### Pitfall 1: RLS enable blocks ALL rows for the authenticated role until policies exist

**What goes wrong:**
`ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY` with no policies immediately causes every query from the `authenticated` role to return 0 rows (or fail silent on writes). The SSR client uses the publishable (anon/authenticated) key, so every existing SSR page and Server Action that reads prescriptions, medical_certificates, cases, patients, case_reports, case_messages, prescription_templates, or report_templates will silently return empty results or fail — with no error, no log, just missing data. RLS default-deny is by design.

**Why it happens:**
Developers treat `ENABLE ROW LEVEL SECURITY` as an atomic hardening step. It is only the first half; the second half is `CREATE POLICY`. Shipping the `ALTER TABLE` migration without the policies in the same migration is the single most common RLS retrofit mistake.

**How to avoid:**
Always write `ENABLE ROW LEVEL SECURITY` and the corresponding `FOR ALL USING (profile_id = (select id from public.profiles where auth_user_id = auth.uid()))` policy in the same migration file, applied atomically. Test the migration against a staging database with an authenticated session before promoting to production.

**Warning signs:**
- Listing pages load with no records immediately after a migration
- No error in Next.js server logs or Supabase logs — just empty arrays returned
- The admin client (service role) still sees rows, but the SSR client sees none

**Phase to address:** Phase 1 (Security: RLS + IDOR fix) — the first thing deployed

---

### Pitfall 2: The service-role admin client silently bypasses RLS even after policies are added

**What goes wrong:**
`createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY`, which carries `bypassrls` privilege at the Postgres role level. Any query executed through this client ignores all RLS policies. The current codebase uses `createAdminClient()` as the `storageClient` in both single and bulk delete actions. If ownership is not enforced in application code before calling these actions, the admin client becomes an unrestricted delete path regardless of RLS.

**Why it happens:**
RLS retrofit gives false confidence: "now the DB enforces ownership." But the admin client was always outside that enforcement — and it remains outside after RLS is enabled. The comment in `delete-prescription.ts` that says "RLS ensures only the profile owner can delete" is literally false when the admin client is used for the storage leg and no `profile_id` filter exists on the DB leg.

**How to avoid:**
1. Add `.eq("profile_id", profileId)` to every `delete()` call in `modules/prescriptions/delete-prescription.ts` and `modules/medical-certificates/delete-medical-certificate.ts` before or simultaneously with enabling RLS.
2. Replace the admin client for storage deletes with user-scoped storage RLS policies so the regular SSR client can delete its own objects without needing the admin bypass.
3. Reserve `createAdminClient()` exclusively for `auth.admin.deleteUser` in account deletion. Never pass it into a user-triggered delete path.

**Warning signs:**
- Any call to `deletePrescription` or `deleteMedicalCertificate` where `storageClient` is the admin client and `prescriptionId`/`certificateId` lacks a profile ownership check
- Any server action that instantiates `createAdminClient()` for a non-auth-admin operation

**Phase to address:** Phase 1 (Security: RLS + IDOR fix) — required before Phase 2 (share-links)

---

### Pitfall 3: `profiles` table uses `auth_user_id` not `id` as the FK anchor — policies written against `auth.uid()` must traverse the join

**What goes wrong:**
The standard Supabase RLS pattern is `user_id = auth.uid()`. In this schema, `public.profiles.id` is an auto-generated UUID that is NOT the same as `auth.users.id`. `public.profiles.auth_user_id` is the FK to `auth.users.id`. All data tables reference `profile_id` which maps to `public.profiles.id`. A policy written as `profile_id = auth.uid()` will never match any row and silently blocks all access — identical symptom to Pitfall 1 but harder to diagnose because the migration "looks correct."

**Why it happens:**
Non-standard indirection. Most Supabase tutorials assume `profiles.id = auth.uid()`. This schema has a one-hop join: `auth.uid()` → `profiles.auth_user_id` → `profiles.id` → data tables `profile_id`.

**How to avoid:**
All RLS policies on data tables must use a subquery:
```sql
profile_id = (
  select id from public.profiles
  where auth_user_id = auth.uid()
)
```
Wrap this in a `SECURITY DEFINER` function (e.g., `private.current_profile_id()`) to avoid re-evaluating it per row and to prevent the infinite-recursion risk if the `profiles` table itself ever has a policy that joins back.

**Warning signs:**
- Policies compiled without error but all data returns empty for authenticated users
- `SELECT id FROM profiles WHERE auth_user_id = auth.uid()` returns a row in the SQL editor but application queries return nothing

**Phase to address:** Phase 1 (Security: RLS + IDOR fix)

---

### Pitfall 4: `authenticated_users` table has its own `profile_id` column — forgetting to add RLS to it creates a second unprotected path

**What goes wrong:**
`public.authenticated_users` stores `profile_id`, `phone`, `status`. It does not appear in the CONCERNS.md RLS list but it is a public-schema table. If RLS is added to `profiles` and all data tables but forgotten on `authenticated_users`, an authenticated user can query another user's subscription status and phone number via the anon/authenticated API. The signup trigger and the `getAuthenticatedUser` module both read from this table.

**Why it happens:**
Checklist-driven RLS retrofits can miss tables that are not obviously "data" tables. `authenticated_users` looks like a join/link table.

**How to avoid:**
Enumerate every table in `public.*` (not just the ones in CONCERNS.md) and add RLS to each. SQL to audit: `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false`.

**Warning signs:**
- `pg_tables` query shows any `public` table with `rowsecurity = false` after the migration

**Phase to address:** Phase 1 (Security: RLS + IDOR fix)

---

### Pitfall 5: Share-link tokens stored as UUIDs are enumerable / guessable if not using cryptographically random tokens

**What goes wrong:**
If the share-link token is a UUID v4, it is 122 bits of entropy — practically safe. If the token is derived from a sequential ID, a `created_at` timestamp, the `prescription.id` itself, or a short-hash, it becomes guessable. An attacker who receives one valid token can brute-force adjacent tokens, exposing another patient's prescription or medical certificate. In a medical context this is a LGPD Art. 11 violation (sensitive personal health data processed without valid legal basis or consent).

**Why it happens:**
Developers often reuse the document's own primary key as the "token" to avoid adding a `token` column. Or they use `crypto.randomBytes(8).toString('hex')` (64 bits) thinking that's sufficient, when token storage in a database makes offline brute-force irrelevant but online enumeration still applies.

**How to avoid:**
1. Add a dedicated `share_token` column (`text not null unique default encode(gen_random_bytes(32), 'hex')`) — 256 bits, unguessable.
2. Never expose the prescription's `id` UUID in the share URL path (use only the token).
3. Add a `share_token_expires_at timestamptz` column and enforce expiry server-side (not only via Supabase signed URL TTL, because CDN caching can outlive token expiry — confirmed in Context7 docs).

**Warning signs:**
- Share URL contains `prescriptionId` or `certificateId` in path
- Token column is missing; URL embeds the storage signed URL directly (signed URLs are enumerable via token query param rotation)

**Phase to address:** Phase 2 (Patient share-links) — but the token schema must be designed before building the feature

---

### Pitfall 6: Supabase storage signed URLs continue serving from CDN cache after token expiry — deleting the object is the only reliable revocation

**What goes wrong:**
A share-link that uses `createSignedUrl` with a TTL (e.g., 1 hour) appears to expire, but if the URL has been cached at Supabase's Smart CDN edge, the cached response continues serving until the CDN cache TTL expires, independently of the token's `expiresIn`. Per official Supabase docs: "Token expiry and the object's response cache TTL are independent. Once a response is cached at the edge, that cached response can continue to be served for the same signed URL until the CDN cache duration expires, even if the token in that URL has already expired."

**Why it happens:**
Developers assume token expiry = access revocation. CDN caching breaks this assumption.

**How to avoid:**
For medical documents under LGPD:
1. Store a token in a DB table with `expires_at`, serve the PDF through your own API route (`/api/share/[token]/download`), validate the token server-side, stream the file. Do NOT hand the patient a signed Supabase storage URL directly.
2. If you must use signed URLs, set `cacheControl: "no-store"` when generating them, and set the TTL to a short window (e.g., 60 seconds) that the patient uses immediately.
3. If a document must be revoked (patient request, LGPD Art. 18 erasure), delete the storage object — that is the only reliable way to purge CDN cache.

**Warning signs:**
- Share-link route hands the patient a `signedUrl` from Supabase storage directly
- No server-side expiry validation in the API route
- No revocation mechanism (doctor cannot invalidate a previously shared link)

**Phase to address:** Phase 2 (Patient share-links)

---

### Pitfall 7: Public share-link endpoint exposes protected health data to the `anon` role without explicit LGPD consent record

**What goes wrong:**
A URL shared via WhatsApp is effectively public — it can be forwarded, indexed, or accessed by anyone with the link. Under LGPD, personal health data is sensitive data (Art. 11). Sharing it requires either the data subject's explicit consent or another legal basis (e.g., health treatment). If a doctor shares a prescription link and the patient's WhatsApp is compromised, the link enables third-party access with no audit trail or consent record in the system.

**Why it happens:**
Developers treat "the patient asked for it" as sufficient. LGPD requires that the legal basis be documented and the data subject notified of sharing.

**How to avoid:**
1. Log every share-link generation event: who generated it, for which patient, which document, when, and the expiry.
2. Log every access to the share-link endpoint (IP, timestamp, user-agent).
3. Keep links short-lived (24–48 hours maximum for prescriptions; atestados may need longer but should default short).
4. Add a `revoked_at` column and honor it server-side.
5. Do not build the share-link feature until the access log table and the revocation mechanism are implemented — never ship the happy path alone.

**Warning signs:**
- No `share_link_audit_log` table (or equivalent) in the schema
- The API route for download does not write an access event to the DB
- No revocation UI for the doctor

**Phase to address:** Phase 2 (Patient share-links) — audit log required before launch

---

### Pitfall 8: Decomposing large client components breaks implicit state contracts between co-located sections

**What goes wrong:**
`new-case-workspace.tsx` (1175 lines) and `medical-certificate-wizard.tsx` (1023 lines) have multi-step flows where state transitions, validation, and submission are tightly coupled inside one component tree. When sections are extracted into child components, prop-drilling gaps or lifted-state mismatches cause steps to re-initialize, lose data between transitions, or submit stale values. With zero component tests, these regressions ship silently.

**Why it happens:**
Large components feel like they can be split along visual boundaries ("step 1 goes here, step 2 goes there"). The actual dependency is on shared `useState`/`useRef` that was never formalized into a hook or context. Extraction exposes the implicit contract only at runtime.

**How to avoid:**
1. Before extracting any JSX, extract the state logic first into a dedicated hook (e.g., `use-case-workspace-state.ts`). The hook owns all state and returns stable refs/callbacks.
2. Only after the hook is stable and tested (pure function tests where possible), wire child components to it via props or a narrow context.
3. Write a "smoke test" for the extracted hook's state machine before touching the component tree — `node:test` can test hooks extracted to plain functions.
4. Extract one section at a time; verify end-to-end manually between each extraction.

**Warning signs:**
- Form values resetting when navigating between wizard steps after extraction
- `useEffect` dependencies growing unexpectedly after extraction (signals shared state leaking)
- TypeScript compiles but runtime shows `undefined` where a value was previously always present

**Phase to address:** Phase 3 (Component decomposition) — after security phases are complete

---

### Pitfall 9: Refactoring the 662-line `send-case-assistant-message` action breaks the `__FALAPED_JSON__` payload contract consumed by the client renderer

**What goes wrong:**
`actions/cases/send-case-assistant-message.ts` emits a `PAYLOAD_PREFIX + JSON.stringify(...)` string that the client component parses to render assistant actions. If refactoring changes the shape of `AssistantActionId`, the payload structure, or the prefix string, the client renderer silently renders nothing or crashes. There are no tests for this serialization contract.

**Why it happens:**
The payload format is an ad-hoc protocol embedded in string concatenation. It is not typed end-to-end between server and client. Refactoring feels safe because TypeScript compiles — but the string encoding is invisible to the type system.

**How to avoid:**
1. Before any refactoring, write a test that asserts the exact shape of the serialized payload for each `AssistantActionId` variant using the existing module functions.
2. Define a Zod schema for the payload and parse it on the client side — this makes the contract explicit and failures throw immediately with a useful message instead of silently empty UI.
3. Do not rename or restructure `AssistantActionId` union members without updating the client renderer simultaneously (they must be deployed together).

**Warning signs:**
- Assistant response appears but no action cards are rendered in the case workspace
- `JSON.parse` error in client console after an action response
- `PAYLOAD_PREFIX` constant is referenced in more than two files (signals the contract has leaked)

**Phase to address:** Phase 3 (Component decomposition) — if this action is touched at all

---

### Pitfall 10: CI setup with broken local Yarn/corepack produces a "green CI, red local" gap that delays catching real failures

**What goes wrong:**
`yarn test` fails locally due to `Cannot find module .../yarn/1.22.22/bin/yarn.js`. CI runs on a clean GitHub Actions runner where corepack and Yarn are installed correctly. Developers start trusting CI as the source of truth and stop running tests locally. The feedback loop lengthens. Meanwhile, if CI is set up to use `yarn install` without `--frozen-lockfile`, new (unpinned) versions of `@supabase/ssr` or `@supabase/supabase-js` can be pulled in silently on each CI run.

**Why it happens:**
Local tooling problems are treated as "my machine, not the code" — true initially, but they mask whether tests are actually passing in the right environment. `latest` pinning in `package.json` means `yarn install` in CI might resolve different package versions than what the local `yarn.lock` specifies if the lockfile is not respected.

**How to avoid:**
1. CI must use `yarn install --frozen-lockfile` to prevent silent dependency drift.
2. Fix the local corepack issue by running `corepack enable && corepack prepare yarn@1.22.22 --activate` once on each developer machine — document this in a `CONTRIBUTING.md` or `Makefile`.
3. Pin `@supabase/ssr` and `@supabase/supabase-js` to explicit semver (e.g., `^2.x.x`) in `package.json` immediately — the `latest` tag is an active supply-chain and breaking-change risk.
4. Run `npx tsx --test <file>` directly in CI instead of `yarn test` if yarn resolution is unstable, to decouple the test run from the package manager.

**Warning signs:**
- CI passes but `yarn test` fails locally on a fresh clone
- `yarn.lock` has a diff after a fresh `yarn install` in CI (means `--frozen-lockfile` is not set)
- `@supabase/ssr` version in CI `node_modules` differs from what is in `yarn.lock`

**Phase to address:** Phase 4 (Tests & CI) — the very first step before writing any CI workflow

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Enable RLS without a policy on `authenticated_users` table | Fewer migration lines | Second unprotected path; phone + status exposed | Never — add RLS to every public table |
| Use the admin client for storage deletes because "user RLS is complex to set up" | Faster to ship | God-mode client in user-triggered path; IDOR blast radius stays wide | Never in a user-triggered delete |
| Share signed Supabase storage URL directly with patient | No API route needed | CDN cache outlives token; no revocation; no audit trail | Never for medical PHI |
| Split component JSX before extracting state into a hook | Smaller files sooner | State contract breaks silently; re-initialization bugs | Never — always extract state first |
| Skip `--frozen-lockfile` in CI | Simpler CI config | `latest` packages silently upgrade between runs; non-reproducible | Never when dependencies include `latest` |
| Reuse `prescription.id` as the share-link token | No extra column | UUID is guessable relative to known UUIDs; violates LGPD minimization | Never for medical data |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase RLS + SSR server client | Writing policy as `profile_id = auth.uid()` — wrong because `profiles.id ≠ auth.uid()` | Use `profile_id = (select id from profiles where auth_user_id = auth.uid())` |
| Supabase RLS + service-role admin client | Assuming RLS protects admin-client queries | Service role always bypasses RLS; ownership must be enforced in application code before calling admin client |
| Supabase storage signed URLs + CDN | Treating token expiry as access revocation | Use own API route for serving files; signed URL TTL ≠ CDN eviction |
| Supabase storage RLS | Using admin client for user-triggered deletes because storage policies seem complex | Add `(select auth.uid()) = owner_id` policy to `storage.objects`; user client can delete its own objects |
| GitHub Actions + Yarn 1.x + corepack | Not setting `--frozen-lockfile`; trusting runner's default yarn | Pin `actions/setup-node` with `cache: 'yarn'`; always pass `--frozen-lockfile` |
| `node:test` runner in CI | Glob expansion in `find` behaves differently on macOS vs Linux | Use `find . -name '*.spec.ts'` with explicit path; verify glob works on ubuntu-latest |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential storage + DB deletes in bulk action loop | Bulk delete of 10 prescriptions takes 10× longer than expected; partial failures leave orphaned rows | Replace loop with `.delete().in("id", ids).eq("profile_id", profileId)` and a single `storage.remove([...paths])` | Any bulk operation with N > 5 |
| RLS policy subquery re-evaluated per row without a `SECURITY DEFINER` wrapper | Slow list pages after RLS enabled (N+1 auth lookups in Postgres) | Wrap the `profiles` lookup in a `SECURITY DEFINER` function and call it in policies | At ~1,000+ rows per query |
| Re-generating a new signed URL on every page render | Smart CDN never warms; every request is a cache miss + Supabase origin hit | Cache the signed URL on the server (Redis/KV or short-lived DB column) and reuse within the TTL window | At >10 concurrent share-link views |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Forgetting `WITH CHECK` clause on `INSERT`/`UPDATE` RLS policies (only `USING` defined) | Users can write rows with any `profile_id`, bypassing tenant isolation on writes | Always define both `USING` (read) and `WITH CHECK` (write) for `INSERT`, `UPDATE` policies |
| No `FORCE ROW LEVEL SECURITY` on tables where the Postgres table owner runs queries | Table owner bypasses RLS; seed scripts or edge functions running as owner expose all data | Add `ALTER TABLE ... FORCE ROW LEVEL SECURITY` after enabling RLS |
| Using `anon` role to serve share-link document without verifying token in application code | Anyone with a valid anon key can construct a Supabase API call and fetch any row if the policy is too permissive | Never expose `share_token` rows directly via anon REST API; always serve through an authenticated API route that validates the token server-side |
| Logging `pdfStoragePath` in error messages that flow to a client-visible toast | Storage paths contain sufficient information to reconstruct download URLs | Log storage paths only to `console.error` (server-only); never include them in user-facing error strings |
| No expiry enforcement on share tokens at the application layer | Expired tokens remain valid if the DB row is not checked | Always validate `share_token_expires_at > now()` in the API route, independent of the Supabase signed URL TTL |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Share-link sends patient a raw Supabase storage URL | URL contains project ID, bucket name, file path — confusing and leaks infra details | Route through `/api/share/[token]/download`; short, opaque URL |
| No confirmation step before bulk delete of prescriptions | Doctor accidentally deletes all selected with one click | Show a modal with count; require confirmation; show undo option (soft-delete first) |
| Wizard component loses form state when a large subcomponent is extracted and re-mounted | Doctor fills step 1, navigates to step 2, sees step 1 reset | Extract state to a hook above the wizard; children receive stable callbacks only |
| Silent catch blocks in generation actions cause doctor to see empty document with no error message | Doctor thinks document was generated; saves/shares empty PDF | Replace `catch {}` with `catch (e) { console.error(...); throw e; }` in generation paths; surface errors via toast |

---

## "Looks Done But Isn't" Checklist

- [ ] **RLS enabled:** Verify with `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false` — must return 0 rows after migration
- [ ] **RLS policies complete:** Verify `SELECT * FROM pg_policies WHERE schemaname = 'public'` — every data table has both `SELECT` and `INSERT`/`UPDATE`/`DELETE` policies
- [ ] **IDOR fixed:** Verify `DELETE FROM prescriptions WHERE id = $1` query includes `.eq("profile_id", profileId)` — search codebase for `.delete().eq("id",` with no subsequent `.eq("profile_id"`
- [ ] **Share-link token entropy:** Verify token column is 32 bytes (`gen_random_bytes(32)`) — not a UUID, not a short hash
- [ ] **Share-link audit log:** Verify every access to `/api/share/[token]/download` writes a record to an audit table before streaming the file
- [ ] **Share-link revocation:** Verify the doctor can invalidate a previously issued token from the UI
- [ ] **CI frozen lockfile:** Verify `.github/workflows/*.yml` includes `yarn install --frozen-lockfile`
- [ ] **Supabase deps pinned:** Verify `package.json` no longer shows `"@supabase/ssr": "latest"` or `"@supabase/supabase-js": "latest"`
- [ ] **Component decomposition:** Verify state hooks exist and have tests before any JSX extraction
- [ ] **Payload contract test:** Verify at least one test covers `send-case-assistant-message` serialization output shape

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS enabled with no policy — production shows no data | HIGH | Write and deploy emergency migration adding policies immediately; monitor Supabase logs for auth errors; notify affected users if data appeared missing |
| Admin client used for delete without ownership check — IDOR exploited | HIGH | Rotate service role key immediately; audit `prescriptions` and `medical_certificates` tables for cross-profile deletes (compare `profile_id` vs deleted-by auth session logs); notify DPA if PHI accessed |
| Share-link token enumeration detected | HIGH | Rotate all existing tokens (set `revoked_at = now()` on all rows); delete and re-upload affected PDFs to new storage paths; notify affected patients per LGPD Art. 48 (breach notification within 2 business days to ANPD) |
| Component refactor causes wizard state loss | MEDIUM | Revert extraction; re-extract state hook first; add smoke tests before re-attempting |
| CI picks up a breaking `@supabase/ssr latest` version | MEDIUM | Pin `yarn.lock` to previous resolved version; use `yarn add @supabase/ssr@<last-known-good>`; add version pinning to `package.json` |
| Local yarn corepack never fixed — developers skip tests | LOW | Document `corepack enable && corepack prepare yarn@1.22.22 --activate` in onboarding; add `npx tsx --test` fallback to CI so it does not depend on yarn script |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS enable with no policy blocks all rows | Phase 1 (Security) | `pg_tables` query shows 0 unprotected public tables |
| Admin client bypasses RLS in user-triggered deletes | Phase 1 (Security) | Code search for `createAdminClient()` outside `delete-account.ts`; none found |
| `profiles.id ≠ auth.uid()` — wrong policy anchor | Phase 1 (Security) | Authenticated API call from test session returns correct owned rows |
| `authenticated_users` table missing RLS | Phase 1 (Security) | `pg_tables` query includes `authenticated_users` with `rowsecurity = true` |
| Share-link token guessable / enumerable | Phase 2 (Share-links) | Token column is 64-char hex (`gen_random_bytes(32)`); no document UUID in URL |
| Signed URL CDN cache outlives token expiry | Phase 2 (Share-links) | Share-link served via own API route with server-side token validation; no direct signed URL returned to patient |
| No LGPD audit log for share-link access | Phase 2 (Share-links) | `share_link_audit_log` table exists; every download route writes a record |
| Component state breaks on JSX extraction | Phase 3 (Decomposition) | Each extracted hook has at least one `node:test` spec; manual wizard flow passes end-to-end |
| `__FALAPED_JSON__` payload contract broken by refactor | Phase 3 (Decomposition) | Payload shape test exists; CI runs it; client renders assistant actions correctly |
| CI runs with unfrozen lockfile + `latest` Supabase | Phase 4 (Tests & CI) | `yarn install --frozen-lockfile` in CI; `@supabase/ssr` and `@supabase/supabase-js` pinned in `package.json` |
| Local yarn corepack broken masks test failures | Phase 4 (Tests & CI) | CI test step uses `npx tsx --test` directly; does not depend on `yarn test` binary resolution |

---

## Sources

- Supabase RLS official docs (Context7 `/supabase/supabase`, retrieved 2026-06-04): enable RLS, policy structure, `bypassrls` for service role, `FORCE ROW LEVEL SECURITY`, CDN signed URL caching behavior
- Supabase storage docs (Context7): signed URL TTL vs CDN cache independence; `createSignedUrl` patterns; public vs private buckets
- Codebase audit: `.planning/codebase/CONCERNS.md` (2026-06-04) — IDOR finding confirmed in `modules/prescriptions/delete-prescription.ts:33`, `modules/medical-certificates/delete-medical-certificate.ts:33`; admin client usage in delete actions confirmed
- Direct file reads: `lib/supabase/server.ts`, `lib/supabase/server-admin.ts`, `actions/prescriptions/delete-prescription.ts`, `modules/prescriptions/delete-prescription.ts`, `supabase/migrations/20260315000000_prescriptions.sql`, `supabase/migrations/20260228120000_profiles_and_authenticated_users_phase1.sql`
- LGPD Lei 13.709/2018 Art. 11 (sensitive personal data), Art. 18 (data subject rights), Art. 48 (incident notification to ANPD) — training knowledge, MEDIUM confidence; verify against current ANPD guidance
- `.planning/codebase/TESTING.md` (2026-06-04) — corepack/yarn local failure documented; `node:test` runner confirmed

---
*Pitfalls research for: Falaped v1.1 — RLS retrofit, share-links, component decomposition, CI*
*Researched: 2026-06-04*

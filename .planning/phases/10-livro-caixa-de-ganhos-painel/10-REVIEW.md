---
phase: 10-livro-caixa-de-ganhos-painel
reviewed: 2026-08-21T23:08:51Z
depth: standard
files_reviewed: 65
files_reviewed_list:
  - actions/cases/delete-case.ts
  - actions/financial-entries/create-case-financial-entries.ts
  - actions/financial-entries/create-standalone-financial-entry.ts
  - actions/financial-entries/index.ts
  - actions/financial-entries/prepare-case-earnings.ts
  - actions/financial-entries/restore-financial-entry.ts
  - actions/financial-entries/void-financial-entry.ts
  - actions/index.ts
  - actions/procedure-catalog/create-procedure-catalog-item.ts
  - actions/procedure-catalog/delete-procedure-catalog-item.ts
  - actions/procedure-catalog/index.ts
  - actions/procedure-catalog/update-procedure-catalog-item.ts
  - actions/profile/update-profile.ts
  - app/dashboard/earnings/loading.tsx
  - app/dashboard/earnings/page.tsx
  - app/dashboard/profile/page.tsx
  - app/dashboard/profile/profile-content.tsx
  - components/app-sidebar.tsx
  - components/dashboard/cases/case-detail-actions.tsx
  - components/dashboard/cases/case-detail-content.tsx
  - components/dashboard/cases/case-detail-header-toolbar.tsx
  - components/dashboard/cases/case-detail-header.tsx
  - components/dashboard/cases/case-earnings-card.tsx
  - components/dashboard/cases/close-case-with-earnings-dialog.tsx
  - components/dashboard/earnings/earnings-cards.tsx
  - components/dashboard/earnings/earnings-daily-chart.tsx
  - components/dashboard/earnings/earnings-period-header.tsx
  - components/dashboard/earnings/earnings-table.tsx
  - components/dashboard/earnings/standalone-entry-dialog.tsx
  - components/dashboard/earnings/void-entry-button.tsx
  - components/dashboard/profile/procedure-catalog-card.tsx
  - components/segmented-toggle.tsx
  - lib/formatters.ts
  - lib/money.spec.ts
  - lib/money.ts
  - lib/schemas/financial-entry.spec.ts
  - lib/schemas/financial-entry.ts
  - lib/schemas/procedure-catalog-item.ts
  - lib/schemas/profile.spec.ts
  - lib/schemas/profile.ts
  - modules/cases/delete-case.ts
  - modules/cases/find-owned-case-id.ts
  - modules/financial-entries/count-non-voided-entries-for-case.spec.ts
  - modules/financial-entries/count-non-voided-entries-for-case.ts
  - modules/financial-entries/create-financial-entries.spec.ts
  - modules/financial-entries/create-financial-entries.ts
  - modules/financial-entries/get-case-earnings-totals.ts
  - modules/financial-entries/get-earnings-summary.ts
  - modules/financial-entries/list-financial-entries.spec.ts
  - modules/financial-entries/list-financial-entries.ts
  - modules/financial-entries/restore-financial-entry.ts
  - modules/financial-entries/types.ts
  - modules/financial-entries/void-financial-entry.spec.ts
  - modules/financial-entries/void-financial-entry.ts
  - modules/procedure-catalog/create-procedure-catalog-item.ts
  - modules/procedure-catalog/delete-procedure-catalog-item.spec.ts
  - modules/procedure-catalog/delete-procedure-catalog-item.ts
  - modules/procedure-catalog/list-procedure-catalog-items.ts
  - modules/procedure-catalog/types.ts
  - modules/procedure-catalog/update-procedure-catalog-item.ts
  - modules/profiles/types.ts
  - modules/profiles/update-profile.ts
  - modules/supabase/get-authenticated-user.ts
  - supabase/migrations/20260821000000_procedure_catalog_and_prices.sql
  - supabase/migrations/20260821000100_financial_entries.sql
findings:
  critical: 1
  warning: 10
  info: 13
  total: 24
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-08-21T23:08:51Z
**Depth:** standard
**Files Reviewed:** 65
**Status:** issues_found

## Summary

Cash-book (`financial_entries`), procedure catalog, consultation price on the profile,
the Ganhos panel, the two-step case-closing dialog and the void/undo path.

Verified green: `yarn test` (611 pass), `yarn typecheck`, `yarn build`. The four items the
prompt flagged for scrutiny were traced end to end:

- **`case_id` IDOR:** both actions that accept a `case_id` for a *write or read of money*
  (`createCaseFinancialEntriesAction`, `prepareCaseEarningsAction`) call
  `findOwnedCaseId` before touching `financial_entries`, and both return the same neutral
  message. `voidFinancialEntryAction`/`restoreFinancialEntryAction` take `caseId` only for
  `revalidatePath` and authorize on `(id, profile_id)`. No IDOR found on the money tables.
- **Double-parse anti-pattern:** no instance remains. Every client sends raw form values
  (`standalone-entry-dialog.tsx:87`, `close-case-with-earnings-dialog.tsx:194`,
  `procedure-catalog-card.tsx:95`, `profile-content.tsx:211`) and the action re-parses. I
  confirmed empirically that a second pass *would* fail (ISO `2026-08-21` re-parsed by
  `receivedOnSchema` → "Informe a data no formato dd/mm/aaaa."), so the discipline is
  load-bearing, not cosmetic.
- **Auth/paid gates + `profile_id` scoping:** present in all seven new actions and in both
  RSCs; every new module filters by `profile_id`. `updateProfileAction` has no paid gate,
  which is documented and pre-existing.
- **Void/restore column scope:** the modules write only `voided_at`, asserted by spec. The
  gap is one layer down, at the DB grant (WR-04).

Money arithmetic is clean where it matters: cents are integers everywhere, the average is
computed once in SQL, no UI recomputation, and a 200k-iteration
`formatCentsToInputValue → parseBrlToCents` round-trip is lossless. The defects found are
(a) one missing server-side idempotency guard that can permanently duplicate rows in a
ledger that cannot be deleted, (b) a money parser that silently reinterprets malformed
input instead of rejecting it, and (c) several invariants documented as guaranteed that are
in fact only enforced by the client or by the planner.

No `<structural_findings>` block was supplied with this review, so this report is narrative
findings only.

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01: The D-10 re-billing guard exists only on the read path — a case can be billed twice, permanently

**File:** `actions/financial-entries/create-case-financial-entries.ts:41-101`
**Issue:** `prepareCaseEarningsAction` calls `countNonVoidedEntriesForCase` and answers
`ask: false` when the case already has non-voided entries (D-10). The **write** action does
not: it validates ownership, builds rows and inserts, with no check that the case has
already been billed. Consequences, in a table with no DELETE policy (D-19) and an
`on delete restrict` FK (D-26):

1. Two rapid clicks on "Salvar lançamento" (`close-case-with-earnings-dialog.tsx:453-459` is
   guarded only by `isSaving`, which is not observable to the DOM until React re-renders)
   insert the consultation + every procedure **twice**. The month total and the average are
   both inflated.
2. A stale tab, a retried Server Action, or a replayed request does the same at any later
   date — including into a month the doctor already closed.
3. Recovery is manual: each duplicate row must be voided one by one, and the duplicates
   stay in the ledger forever.

This is the one invariant the phase named as a decision (D-10) and then left unenforced on
the only path that writes money.
**Fix:** re-check inside the action, using the helper that already exists, before building
rows — the guard is 3 lines and closes both the double-click and the replay:

```ts
const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
if (!ownedCaseId) return { ok: false, error: "Caso inválido para este perfil." }

// D-10 no caminho de ESCRITA: o prepare é conselho de UI, este é o guarda.
const alreadyBilled = await countNonVoidedEntriesForCase(supabase, profile.id, ownedCaseId)
if (alreadyBilled > 0) return { ok: true, created: 0 }
```

(Returning `{ ok: true, created: 0 }` keeps the client's existing "Caso encerrado sem
lançamento." branch and makes the action idempotent. A stricter variant returns
`{ ok: false, error: "Este caso já tem lançamentos." }`.)

---

### Warnings

#### WR-01: `parseBrlToCents` strips unknown characters instead of rejecting them — malformed input becomes a silently wrong amount

**File:** `lib/money.ts:24`
**Issue:** `value.trim().replace(/[^0-9.,-]/g, "")` deletes every character it does not
recognise and then parses what is left. Measured on the real implementation:

| input | saved |
|---|---|
| `1e3` | `1300` (R$ 13,00) |
| `1,5e3` | `153` (R$ 1,53) |
| `+250` | `25000` |

A spreadsheet/exported value in scientific notation, or a stray letter next to a digit, is
accepted as a *different* amount with no error — the doctor sees the text they typed in the
field and a plausible number in the ledger. The strip is deliberate (currency prefix, NBSP,
thin space), but it should be a whitelist of *noise*, not of *everything unknown*.
**Fix:** strip only the noise, then fail closed on any residue:

```ts
let cleaned = value.trim().replace(/[\s\u00A0\u202F]|R\$|\$/g, "")
if (cleaned === "" || /[^0-9.,-]/.test(cleaned)) return null
```

This keeps every case in `money.spec.ts` green (`"R$ 1.500,50"`, `" 250 "`, `"1 500,50"`)
and turns `1e3` into the existing PT-BR message "Valor inválido. Use apenas números, ex.:
250,00.".

#### WR-02: More than two decimals is silently rounded, and a sub-cent amount vanishes from a case closing with a success toast

**File:** `lib/money.ts:36`, `lib/schemas/financial-entry.ts:53-59`, `actions/financial-entries/create-case-financial-entries.ts:93`
**Issue:** `Math.round(parsed * 100)` accepts any precision: `"2,999"` → `300` (R$ 3,00),
`"1.234.567,891"` → `123456789`. Two concrete user-visible consequences:

- Case closing: a procedure typed as `"0,004"` parses to `0`, is dropped by the
  zero-value filter at line 93, and the doctor is told **"Caso encerrado sem lançamento."**
  The typo produced no error, no warning and no row.
- Standalone entry: `"0,001"` parses to `0` and the schema answers with the *courtesy*
  message ("O valor deve ser maior que zero. Para cortesia, encerre o caso sem lançar."),
  which is the wrong explanation for a non-zero value that was typed.

**Fix:** reject more than two decimal places at the parser boundary instead of rounding it
away, so the existing "Valor inválido…" message fires:

```ts
// depois de normalizar o separador decimal
if (/\.\d{3,}$/.test(cleaned)) return null
```

Alternatively keep the rounding but surface it (`"Arredondado para R$ 3,00"`); silence is
the part that is wrong.

#### WR-03: `by_day` ordering is not guaranteed — `jsonb_agg` needs its own `ORDER BY`

**File:** `supabase/migrations/20260821000100_financial_entries.sql:249-273`
**Issue:** the `by_day` CTE carries `order by received_on`, and both the module and the
chart document that "a série vem pronta do SQL; nenhum consumidor reordena em JS"
(`earnings-daily-chart.tsx:20-39`). PostgreSQL does not promise that a sort inside a CTE
survives into an aggregate over it (a single-reference CTE is inlinable since PG12, and
`jsonb_agg` has no ordering guarantee without an aggregate `ORDER BY`). If the plan ever
changes, the bar chart plots days in arbitrary order — an X axis of `31, 4, 12, …` — with no
error anywhere.
**Fix:** make the order part of the aggregate, and drop the CTE's decorative `ORDER BY`:

```sql
'by_day', coalesce((
  select jsonb_agg(
    jsonb_build_object('received_on', received_on, 'cents', cents)
    order by received_on
  )
  from by_day
), '[]'::jsonb)
```

#### WR-04: D-19 "value edits are impossible" is not enforced where D-19's sibling (no delete) is

**File:** `supabase/migrations/20260821000100_financial_entries.sql:152-165`
**Issue:** the migration correctly makes *deletion* a database guarantee (no DELETE policy →
RLS denies it, "essa ausência é a garantia mais barata"). Value editing gets no equivalent:
the UPDATE policy is row-scoped only, and the `authenticated` role holds table-wide UPDATE,
so an owner can `PATCH /rest/v1/financial_entries?id=eq.<uuid>` with
`{"amount_cents": 1, "received_on": "…"}` from the browser console with their own session
and rewrite a closed month while `voided_at` stays `null`. The app never issues such an
update (asserted by `void-financial-entry.spec.ts`), so the invariant is app-only — exactly
the shape the migration argues against for DELETE. For an auditability feature this is the
weakest link.
**Fix:** make the column scope a database fact, same cost as the missing DELETE policy:

```sql
-- só a coluna de anulação é escrevível pelo dono
revoke update on public.financial_entries from authenticated;
grant update (voided_at) on public.financial_entries to authenticated;
```

(`updated_at` is set by the trigger, which runs as the table owner, so it is unaffected. A
`before update` trigger raising on any change to `amount_cents`/`description`/`received_on`/
`case_id`/`profile_id` is the equivalent alternative.)

#### WR-05: `procedures` is an unbounded array and accepts duplicate `catalogItemId`

**File:** `lib/schemas/financial-entry.ts:184-189`
**Issue:** `z.array(...)` has no `.max()`, and nothing rejects the same `catalogItemId`
twice. With the project's 25 MB Server Action body limit, one authenticated request can
insert tens of thousands of valid rows into a table whose rows can never be deleted — and
the same catalog item can legitimately-looking appear N times in one closing. The
`catalog.find()` per element is also O(n·m).
**Fix:**

```ts
procedures: z
  .array(z.object({ catalogItemId: z.string().uuid("Procedimento inválido."), amount: nonNegativeAmountCentsSchema }))
  .max(50, "Procedimentos demais em um único encerramento.")
  .refine((rows) => new Set(rows.map((r) => r.catalogItemId)).size === rows.length, {
    message: "Procedimento repetido.",
  }),
```

and build a `Map` from the catalog once in the action instead of `find()` per row.

#### WR-06: the period table is an unbounded query — the platform row cap makes it silently disagree with the SQL total

**File:** `modules/financial-entries/list-financial-entries.ts:74-77`, `app/dashboard/earnings/page.tsx:101-105`
**Issue:** the totals come from `get_earnings_summary` (all rows, aggregated in SQL) while
the table comes from an unlimited, unpaginated `select`. Supabase's REST layer applies a
"Max rows" cap (1000 by default), so a busy month silently renders a truncated table under
a complete total — precisely the "a tela deixa de fechar ao centavo com a soma das linhas"
failure the file header says it is protecting against. There is no `.range()`, no
`count`, and no "showing N of M" affordance.
**Fix:** either add an explicit bound the UI can talk about
(`.range(0, 199)` + `{ count: "exact" }` and a "mostrando 200 de N" line), or paginate the
table by search param like the period navigator already does.

#### WR-07: `getCaseEarningsTotals` fetches every row to sum money in JS

**File:** `modules/financial-entries/get-case-earnings-totals.ts:25-40`
**Issue:** the doc comment says "A soma é feita aqui em inteiros, nunca no componente", but
"here" is still JavaScript over an unbounded `select("amount_cents")`; it inherits the same
row-cap truncation as WR-06, and the truncated sum then decides whether the *destructive*
delete dialog blocks (`case-detail-actions.tsx:82`). Phase 10's own rule is that totals come
from SQL.
**Fix:** aggregate server-side, e.g.
`.select("amount_cents.sum(), id.count()")` (PostgREST aggregate syntax) or fold the two
numbers into a small RPC next to `get_earnings_summary`. If the JS sum is kept, bound it and
treat truncation as a read failure (`null`), because `null` is what makes the dialog fail
closed.

#### WR-08: `if (!profile)` is a dead check — `getAuthenticatedUser` returns a truthy `{}` for anonymous callers

**File:** `actions/financial-entries/void-financial-entry.ts:26`, `actions/financial-entries/restore-financial-entry.ts:30` (also `actions/cases/delete-case.ts:15`, `actions/profile/update-profile.ts:34`)
**Issue:** `getAuthenticatedUser` returns `{ profile: {} as AuthenticatedUserProfile }` when
there is no session (`modules/supabase/get-authenticated-user.ts:34,46`). `{}` is truthy, so
`if (!profile)` never fires and the "Sessão não encontrada." branch is unreachable; the only
thing stopping an anonymous call is `profile.status !== "paid"` on the next line. The five
other new actions use the correct `if (!profile?.id)`. If the paid gate is ever reordered or
relaxed (it already is, in `updateProfileAction`), these paths would reach the database with
`profile_id = undefined`.
**Fix:** use `if (!profile?.id)` in all four, matching
`create-standalone-financial-entry.ts:30`.

#### WR-09: the delete-blocking props default to fail-OPEN, contradicting their own contract

**File:** `components/dashboard/cases/case-detail-actions.tsx:45-46`
**Issue:** the JSDoc says `null` = read failed = **delete is BLOCKED** ("jamais prosseguir
sem poder verificar"), but the defaults are `earningsCount = 0` / `earningsTotalCents = 0`,
i.e. "no entries, delete allowed". Any future call site that forgets the props (the props are
optional) gets an unguarded destructive dialog and the doctor is shown a generic PT-BR
failure only after Postgres refuses. The safe default for a fail-closed contract is `null`.
**Fix:** `earningsCount = null`, `earningsTotalCents = null` — or make both props required,
since there is exactly one call site today.

#### WR-10: the phase's only untested money branch is the one that decides what gets inserted

**File:** `lib/schemas/financial-entry.spec.ts` (covers only `standaloneFinancialEntrySchema`)
**Issue:** `money.spec.ts`, `profile.spec.ts`, the standalone schema, and all four new
modules have recording-mock specs. `caseFinancialEntriesSchema` and the zero-value drop in
`create-case-financial-entries.ts:93` — the reconciliation between `price_cents >= 0` and
`amount_cents > 0`, which the code comments call out as the subtlest decision in the phase —
have none. A regression there is silent: rows disappear and the action still returns
`ok: true`.
**Fix:** one spec asserting (a) `consultationAmount: ""` + `procedures: []` parses OK
(courtesy), (b) a `"0,00"` procedure parses OK and yields `0` (not the courtesy message),
(c) a negative procedure yields "O valor não pode ser negativo.", and (d) `created === 0`
when every row is zero — (d) via the same recording-mock style as
`create-financial-entries.spec.ts`.

---

### Info

#### IN-01: unvalidated client string interpolated into `revalidatePath`

**File:** `actions/financial-entries/void-financial-entry.ts:39`, `actions/financial-entries/restore-financial-entry.ts:43`
**Issue:** `caseId` is typed `string | null` and never validated (the entry id is), then
interpolated into a route path. Worst case is spurious cache invalidation, as the comment
says — but it costs one line to keep junk out of the cache layer.
**Fix:** reuse the uuid schema: `const c = financialEntryIdSchema.safeParse(caseId); if (c.success) revalidatePath(...)` (or a dedicated `caseIdSchema`).

#### IN-02: void/restore report success when zero rows matched

**File:** `modules/financial-entries/void-financial-entry.ts:25-33`, `modules/financial-entries/restore-financial-entry.ts:19-27`
**Issue:** the update has no `.select()`/count, so an id that belongs to nobody (or to
another doctor) returns `{ ok: true }` and the UI shows "Lançamento anulado." plus an undo
affordance for a row that never changed. The non-enumerable response is good for security;
the false-positive toast is not.
**Fix:** `.select("id")` and treat an empty result as a no-op the caller can distinguish
(e.g. return a boolean and keep the same neutral message).

#### IN-03: empty-state copy lies when `?anulados=1` lands on a completely empty month

**File:** `app/dashboard/earnings/page.tsx:110-135`
**Issue:** with the filter on, `entries` includes voided *and* non-voided rows, so
`entries.length === 0` means "nothing at all in this period" — but the branch renders
"Nenhum lançamento anulado neste período." and hides the "Novo lançamento" CTA.
**Fix:** pick the copy on `showVoided && hasAnyEntryInPeriod`, or always render the CTA.

#### IN-04: raw Postgres error text can reach a money toast

**File:** `actions/financial-entries/*.ts` (`e instanceof Error ? e.message : …`), `lib/get-friendly-toast-message.ts:5`
**Issue:** modules throw `[EARNINGS] … : ${error.message}`; the actions pass `e.message`
through, and `getFriendlyToastMessage` strips only the `[TAG]` prefix. Any unexpected DB
failure surfaces English Postgres text on a clinical/financial screen, against the PT-BR
convention. `delete-case.ts` shows the right pattern (sentinel → PT-BR) for the one case it
anticipated. This matches an existing repo-wide pattern (31 occurrences), so it is noted, not
charged to this phase.
**Fix:** return the module message only for known sentinels and fall back to the PT-BR
default otherwise.

#### IN-05: unused exports and an unreachable validation message

**File:** `lib/schemas/financial-entry.ts:17-19,192`, `lib/schemas/procedure-catalog-item.ts:64`
**Issue:** `CaseFinancialEntriesFormData` and `ProcedureCatalogItemFormData` are exported and
never referenced. `paymentMethodSchema` is used only to derive `PaymentMethodInput` while
both object schemas re-declare `z.enum(PAYMENT_METHOD_VALUES, …)` with a different message,
so "Forma de pagamento inválida." can never be shown.
**Fix:** delete the two unused types; reuse `paymentMethodSchema` in the object schemas
(with `.or`/message override if the wording must differ per form).

#### IN-06: the cents ceiling and the negative-sign pre-check are copied three times

**File:** `lib/schemas/financial-entry.ts:32,129`, `lib/schemas/procedure-catalog-item.ts:13,32`, `lib/schemas/profile.ts:5,19`
**Issue:** `2_000_000_000` is declared in three files and the `raw.includes("-")` trick with
its comment in three places. Three copies of a money boundary drift.
**Fix:** export `MAX_CENTS` and a shared `parseNonNegativeCents(raw, ctx)` from `lib/money.ts`
and import it in the three schemas.

#### IN-07: a `TooltipProvider` per table row and per card

**File:** `components/dashboard/earnings/earnings-table.tsx:75-86`, `components/dashboard/earnings/earnings-cards.tsx:130-139`
**Issue:** `TooltipProvider` is a context provider meant to wrap a subtree once; one per row
means N providers per page and no shared `delayDuration` behaviour.
**Fix:** hoist a single provider to the table (or to the dashboard layout) and keep only
`Tooltip`/`TooltipTrigger`/`TooltipContent` per row.

#### IN-08: broken indentation / stray fragment nesting

**File:** `components/dashboard/earnings/earnings-cards.tsx:115-155`
**Issue:** the `emptyState ? … : <>…</>` branch leaves `CardContent` and `{children}` at the
outer indentation level, so the two Faixa-B layouts are hard to diff visually.
**Fix:** re-indent the fragment body (mechanical; no behaviour change).

#### IN-09: `?mes=0000-01` does not fall back to the current month

**File:** `app/dashboard/earnings/page.tsx:64-71`
**Issue:** the regex validates the month (`0[1-9]|1[0-2]`) but not the year, and date-fns
formats year 0 as `0001`, so a forged param renders the period label "janeiro de 0001" with
an empty month instead of the documented "cai no mês corrente". Harmless (verified: no throw,
no DB error), but the comment overstates the guard.
**Fix:** bound the year, e.g. `/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/`, or clamp
`monthStart` to a sane range before formatting.

#### IN-10: `findOwnedCaseId` was extracted but the older copies remain

**File:** `modules/cases/find-owned-case-id.ts:18-42` vs `modules/cases/delete-case.ts:13-31` and `modules/cases/update-case-status.ts`
**Issue:** the JSDoc says the resolution was extracted "em vez de copiada uma terceira e
quarta vez", yet both earlier copies are still in place — three implementations of the same
ownership resolution now exist.
**Fix:** have `deleteCase` and `updateCaseStatus` call `findOwnedCaseId` (out of this phase's
scope, but it is the reason the helper exists).

#### IN-11: Zod v4 `.uuid()` enforces the RFC variant nibble

**File:** `lib/schemas/financial-entry.ts:178,186,201`
**Issue:** measured: Zod 4's `.uuid()` rejects `1111…-1111` (variant nibble must be
`[89abAB]`). `financial_entries`/`procedure_catalog_items` ids come from
`gen_random_uuid()` (v4) so they pass, but `public.cases` predates these migrations and is
also written by the WhatsApp pipeline; any non-RFC id there would fail with the misleading
"Caso inválido para este perfil." even though the doctor owns the case. Authorization is
`findOwnedCaseId` regardless, so the strict format buys little.
**Fix:** if legacy case ids are a possibility, relax `caseId` to `z.string().min(1)` and let
ownership resolution be the gate (it already is).

#### IN-12: the catalog editor renders for non-paid users but all of its actions are paid-gated

**File:** `app/dashboard/profile/page.tsx:11-24`, `components/dashboard/profile/procedure-catalog-card.tsx`
**Issue:** Perfil deliberately has no paid gate (onboarding), but every catalog action does,
so a non-paid user can type into the new "Preços" card and receives "Perfil não ativo…" on
every button. The consultation price field works (it rides `updateProfileAction`), the
procedure list cannot.
**Fix:** hide or disable `ProcedureCatalogCard` when `profile.status !== "paid"` with the
existing PT-BR explanation.

#### IN-13: `add constraint` is not guarded while the column add is

**File:** `supabase/migrations/20260821000000_procedure_catalog_and_prices.sql:103-108`
**Issue:** `add column if not exists` next to a bare
`add constraint profiles_consultation_price_non_negative` — mixed idempotency, so a partial
re-run of this migration fails on the constraint rather than being a no-op.
**Fix:** guard it (`do $$ begin … exception when duplicate_object then null; end $$;`) or
drop the `if not exists` so the file is uniformly non-idempotent.

---

_Reviewed: 2026-08-21T23:08:51Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

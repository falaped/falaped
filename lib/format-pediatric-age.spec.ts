import test from "node:test"
import assert from "node:assert/strict"

import { formatPediatricAge, formatPediatricAgeAbbrev } from "@/lib/format-pediatric-age"
import type { PediatricAge } from "@/lib/compute-pediatric-age"

// The formatter NEVER does date math — it renders a PediatricAge result.
// Non-"ok" statuses return an empty string (the component renders the UI-SPEC copy).

const ok = (over: Partial<PediatricAge>): PediatricAge => ({ status: "ok", ...over })

// ── Status flags → empty string (component owns the copy) ────────────────────

test("missing_birth_date → empty string", () => {
  assert.equal(formatPediatricAge({ status: "missing_birth_date" }), "")
})

test("invalid → empty string", () => {
  assert.equal(formatPediatricAge({ status: "invalid" }), "")
})

test("future → empty string", () => {
  assert.equal(formatPediatricAge({ status: "future" }), "")
})

// ── Days band (singular/plural) ──────────────────────────────────────────────

test("0 days → '0 dias'", () => {
  assert.equal(formatPediatricAge(ok({ band: "days", parts: { days: 0 } })), "0 dias")
})

test("1 day → '1 dia' (singular)", () => {
  assert.equal(formatPediatricAge(ok({ band: "days", parts: { days: 1 } })), "1 dia")
})

test("5 days → '5 dias' (plural)", () => {
  assert.equal(formatPediatricAge(ok({ band: "days", parts: { days: 5 } })), "5 dias")
})

// ── Weeks band (singular/plural) ─────────────────────────────────────────────

test("1 week → '1 semana' (singular)", () => {
  assert.equal(formatPediatricAge(ok({ band: "weeks", parts: { weeks: 1 } })), "1 semana")
})

test("6 weeks → '6 semanas' (plural)", () => {
  assert.equal(formatPediatricAge(ok({ band: "weeks", parts: { weeks: 6 } })), "6 semanas")
})

// ── Months+days band ─────────────────────────────────────────────────────────

test("3 months 12 days → '3 meses e 12 dias'", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "months_days", parts: { months: 3, days: 12 } })),
    "3 meses e 12 dias",
  )
})

test("1 month 1 day → '1 mês e 1 dia' (both singular)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "months_days", parts: { months: 1, days: 1 } })),
    "1 mês e 1 dia",
  )
})

test("4 months 0 days → '4 meses' (omit days clause)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "months_days", parts: { months: 4, days: 0 } })),
    "4 meses",
  )
})

test("1 month 0 days → '1 mês' (singular, omit days)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "months_days", parts: { months: 1, days: 0 } })),
    "1 mês",
  )
})

// ── Years+months band ────────────────────────────────────────────────────────

test("2 years 4 months → '2 anos e 4 meses'", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "years_months", parts: { years: 2, months: 4 } })),
    "2 anos e 4 meses",
  )
})

test("1 year 1 month → '1 ano e 1 mês' (both singular)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "years_months", parts: { years: 1, months: 1 } })),
    "1 ano e 1 mês",
  )
})

test("3 years 0 months → '3 anos' (omit months clause)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "years_months", parts: { years: 3, months: 0 } })),
    "3 anos",
  )
})

test("1 year 0 months → '1 ano' (singular, omit months)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "years_months", parts: { years: 1, months: 0 } })),
    "1 ano",
  )
})

// ── Abbreviated form ─────────────────────────────────────────────────────────

test("abbrev days → '5 d'", () => {
  assert.equal(formatPediatricAgeAbbrev(ok({ band: "days", parts: { days: 5 } })), "5 d")
})

test("abbrev weeks → '6 sem'", () => {
  assert.equal(formatPediatricAgeAbbrev(ok({ band: "weeks", parts: { weeks: 6 } })), "6 sem")
})

test("abbrev months+days → '3m 12d'", () => {
  assert.equal(
    formatPediatricAgeAbbrev(ok({ band: "months_days", parts: { months: 3, days: 12 } })),
    "3m 12d",
  )
})

test("abbrev months, 0 days → '4m'", () => {
  assert.equal(
    formatPediatricAgeAbbrev(ok({ band: "months_days", parts: { months: 4, days: 0 } })),
    "4m",
  )
})

test("abbrev years+months → '2a 4m'", () => {
  assert.equal(
    formatPediatricAgeAbbrev(ok({ band: "years_months", parts: { years: 2, months: 4 } })),
    "2a 4m",
  )
})

test("abbrev years, 0 months → '3a'", () => {
  assert.equal(
    formatPediatricAgeAbbrev(ok({ band: "years_months", parts: { years: 3, months: 0 } })),
    "3a",
  )
})

test("abbrev non-ok status → empty string", () => {
  assert.equal(formatPediatricAgeAbbrev({ status: "invalid" }), "")
})

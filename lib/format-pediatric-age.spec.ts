import test from "node:test"
import assert from "node:assert/strict"

import { formatPediatricAge, formatPediatricAgeAbbrev, formatPediatricAgeFull, formatPediatricAgeShort } from "@/lib/format-pediatric-age"
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

test("2 years 1 month 13 days → '2 anos, 1 mês e 13 dias' (3-part, D-07 refinement)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "years_months", parts: { years: 2, months: 1, days: 13 } })),
    "2 anos, 1 mês e 13 dias",
  )
})

test("2 years 0 months 5 days → '2 anos e 5 dias' (omit zero months clause)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "years_months", parts: { years: 2, months: 0, days: 5 } })),
    "2 anos e 5 dias",
  )
})

test("2 years 4 months 0 days → '2 anos e 4 meses' (omit zero days clause)", () => {
  assert.equal(
    formatPediatricAge(ok({ band: "years_months", parts: { years: 2, months: 4, days: 0 } })),
    "2 anos e 4 meses",
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

test("abbrev years+months+days → '2a 1m 13d'", () => {
  assert.equal(
    formatPediatricAgeAbbrev(ok({ band: "years_months", parts: { years: 2, months: 1, days: 13 } })),
    "2a 1m 13d",
  )
})

test("abbrev years+days, 0 months → '2a 5d'", () => {
  assert.equal(
    formatPediatricAgeAbbrev(ok({ band: "years_months", parts: { years: 2, months: 0, days: 5 } })),
    "2a 5d",
  )
})

test("abbrev non-ok status → empty string", () => {
  assert.equal(formatPediatricAgeAbbrev({ status: "invalid" }), "")
})

test("formatPediatricAgeShort tira os dias quando já há meses ou anos", () => {
  const ok = (band: string, parts: Record<string, number>) => ({ status: "ok", band, parts }) as unknown as Parameters<typeof formatPediatricAgeShort>[0]
  assert.equal(formatPediatricAgeShort(ok("years_months", { years: 2, months: 3, days: 6 })), "2a 3m")
  assert.equal(formatPediatricAgeShort(ok("years_months", { years: 4, months: 0, days: 6 })), "4a")
  assert.equal(formatPediatricAgeShort(ok("months_days", { months: 8, days: 6 })), "8m")
  assert.equal(formatPediatricAgeShort(ok("weeks", { weeks: 6 })), "6 sem")
  assert.equal(formatPediatricAgeShort(ok("days", { days: 5 })), "5 d")
})

test("formatPediatricAgeFull: anos, meses, semanas e dias, sem partes zeradas", () => {
  const now = new Date("2026-10-07T15:00:00")
  assert.equal(formatPediatricAgeFull("2022-03-22", now), "4 anos, 6 meses, 2 semanas e 1 dia")
  assert.equal(formatPediatricAgeFull("2026-09-07", now), "1 mês")
  assert.equal(formatPediatricAgeFull("2026-09-27", now), "1 semana e 3 dias")
  assert.equal(formatPediatricAgeFull("2026-10-07", now), "Nasceu hoje")
  assert.equal(formatPediatricAgeFull("2027-01-01", now), "")
  assert.equal(formatPediatricAgeFull(null, now), "")
})

import test from "node:test"
import assert from "node:assert/strict"

import { computePediatricAge } from "@/lib/compute-pediatric-age"

// All tests pass an explicit `now` (local-constructed) so they are deterministic
// and independent of the machine timezone.

test("missing birth date (null) → status missing_birth_date (D-09)", () => {
  assert.deepEqual(computePediatricAge(null, new Date(2026, 5, 28)), {
    status: "missing_birth_date",
  })
})

test("missing birth date (undefined) → status missing_birth_date (D-09)", () => {
  assert.deepEqual(computePediatricAge(undefined, new Date(2026, 5, 28)), {
    status: "missing_birth_date",
  })
})

test("invalid birth date (non-date string) → status invalid (D-12)", () => {
  assert.deepEqual(computePediatricAge("abc", new Date(2026, 5, 28)), {
    status: "invalid",
  })
})

test("invalid birth date (out-of-range month/day) → status invalid (D-12)", () => {
  assert.deepEqual(computePediatricAge("2025-13-40", new Date(2026, 5, 28)), {
    status: "invalid",
  })
})

test("non-iso-shaped date (dd/mm/yyyy) → status invalid (D-12)", () => {
  assert.deepEqual(computePediatricAge("12/03/2025", new Date(2026, 5, 28)), {
    status: "invalid",
  })
})

test("future birth date → status future (D-12)", () => {
  assert.deepEqual(computePediatricAge("2026-07-01", new Date(2026, 5, 28)), {
    status: "future",
  })
})

test("born today → days band, 0 days", () => {
  const r = computePediatricAge("2026-06-28", new Date(2026, 5, 28))
  assert.equal(r.status, "ok")
  assert.equal(r.band, "days")
  assert.equal(r.totalDays, 0)
  assert.deepEqual(r.parts, { days: 0 })
})

test("newborn 1 day → days band, 1 day", () => {
  const r = computePediatricAge("2026-06-27", new Date(2026, 5, 28))
  assert.equal(r.status, "ok")
  assert.equal(r.band, "days")
  assert.equal(r.totalDays, 1)
  assert.deepEqual(r.parts, { days: 1 })
})

test("newborn 2 days → days band, 2 days", () => {
  const r = computePediatricAge("2026-06-26", new Date(2026, 5, 28))
  assert.equal(r.status, "ok")
  assert.equal(r.band, "days")
  assert.equal(r.totalDays, 2)
  assert.deepEqual(r.parts, { days: 2 })
})

test("28 days → still days band (upper edge)", () => {
  // birth 2026-06-01, now 2026-06-29 → 28 days
  const r = computePediatricAge("2026-06-01", new Date(2026, 5, 29))
  assert.equal(r.band, "days")
  assert.equal(r.totalDays, 28)
  assert.deepEqual(r.parts, { days: 28 })
})

test("29 days → weeks band (just past the days cutoff)", () => {
  // birth 2026-06-01, now 2026-06-30 → 29 days → 4 weeks
  const r = computePediatricAge("2026-06-01", new Date(2026, 5, 30))
  assert.equal(r.band, "weeks")
  assert.equal(r.totalDays, 29)
  assert.deepEqual(r.parts, { weeks: 4 })
})

test("35 days → weeks band, 5 weeks", () => {
  // birth 2026-05-01, now 2026-06-05 → 35 days → 5 weeks
  const r = computePediatricAge("2026-05-01", new Date(2026, 5, 5))
  assert.equal(r.band, "weeks")
  assert.equal(r.totalDays, 35)
  assert.deepEqual(r.parts, { weeks: 5 })
})

test("83 days → still weeks band (upper edge, < 84)", () => {
  // birth 2026-01-01, now 2026-03-25 → 83 days → 11 weeks
  const r = computePediatricAge("2026-01-01", new Date(2026, 2, 25))
  assert.equal(r.totalDays, 83)
  assert.equal(r.band, "weeks")
  assert.deepEqual(r.parts, { weeks: 11 })
})

test("84 days (~12 weeks) → switches to months_days band (D-11)", () => {
  // birth 2026-01-01, now 2026-03-26 → 84 days
  const r = computePediatricAge("2026-01-01", new Date(2026, 2, 26))
  assert.equal(r.totalDays, 84)
  assert.equal(r.band, "months_days")
})

test("months+days band: 3 meses e 12 dias", () => {
  const r = computePediatricAge("2025-03-12", new Date(2025, 5, 24))
  assert.equal(r.status, "ok")
  assert.equal(r.band, "months_days")
  assert.deepEqual(r.parts, { months: 3, days: 12 })
})

test("months+days band: exact months, 0 days remainder", () => {
  // birth 2025-01-10, now 2025-05-10 → 4 months, 0 days
  const r = computePediatricAge("2025-01-10", new Date(2025, 4, 10))
  assert.equal(r.band, "months_days")
  assert.deepEqual(r.parts, { months: 4, days: 0 })
})

test("end-of-month trap: birth Jan-31, now Mar-01 (calendar-correct via duration)", () => {
  // intervalToDuration handles variable month lengths; must NOT manual-subtract.
  const r = computePediatricAge("2025-01-31", new Date(2025, 2, 1))
  assert.equal(r.band, "months_days")
  // Jan-31 → Feb-28 is 1 month (anniversary clamps), then Feb-28 → Mar-01 is 1 day.
  assert.equal(r.parts?.months, 1)
  assert.ok((r.parts?.days ?? -1) >= 0)
})

test("leap year: birth 2024-02-29, now 2025-03-01 (non-leap) → ~1 year, years_months band", () => {
  const r = computePediatricAge("2024-02-29", new Date(2025, 2, 1))
  assert.equal(r.band, "years_months")
  assert.equal(r.parts?.years, 1)
  assert.equal(r.parts?.months, 0)
})

test("year rollover: birth 2024-12-20, now 2025-01-05 → 16 days across the boundary", () => {
  const r = computePediatricAge("2024-12-20", new Date(2025, 0, 5))
  assert.equal(r.totalDays, 16)
  assert.equal(r.band, "days")
  assert.deepEqual(r.parts, { days: 16 })
})

test("years+months band: 2 anos e 4 meses", () => {
  const r = computePediatricAge("2023-02-10", new Date(2025, 5, 10))
  assert.equal(r.band, "years_months")
  assert.deepEqual(r.parts, { years: 2, months: 4 })
})

test("years band: exact years, 0 months remainder", () => {
  // birth 2022-06-10, now 2025-06-10 → 3 years, 0 months
  const r = computePediatricAge("2022-06-10", new Date(2025, 5, 10))
  assert.equal(r.band, "years_months")
  assert.deepEqual(r.parts, { years: 3, months: 0 })
})

test("24 months cutoff → years_months band (not months_days)", () => {
  // birth 2023-06-10, now 2025-06-10 → exactly 24 months → years_months
  const r = computePediatricAge("2023-06-10", new Date(2025, 5, 10))
  assert.equal(r.band, "years_months")
  assert.equal(r.parts?.years, 2)
})

test("near-local-midnight: explicit `now` time-of-day does not flip day count", () => {
  // birth 2026-06-26 (2 days before). now at 23:59 local vs 00:01 local → same count.
  const lateNight = new Date(2026, 5, 28, 23, 59, 59)
  const earlyMorning = new Date(2026, 5, 28, 0, 1, 0)
  const a = computePediatricAge("2026-06-26", lateNight)
  const b = computePediatricAge("2026-06-26", earlyMorning)
  assert.equal(a.totalDays, 2)
  assert.equal(b.totalDays, 2)
  assert.deepEqual(a.parts, b.parts)
})

// ── Corrected age (D-10) ─────────────────────────────────────────────────────

test("full-term (gestationalAgeWeeks >= 37) → no corrected field", () => {
  const r = computePediatricAge("2025-03-12", new Date(2025, 5, 24), 39)
  assert.equal(r.status, "ok")
  assert.equal(r.corrected, undefined)
})

test("gestational age null → no corrected field", () => {
  const r = computePediatricAge("2025-03-12", new Date(2025, 5, 24), null)
  assert.equal(r.corrected, undefined)
})

test("gestational age absent (arg omitted) → no corrected field", () => {
  const r = computePediatricAge("2025-03-12", new Date(2025, 5, 24))
  assert.equal(r.corrected, undefined)
})

test("preterm (32 weeks), chronological 3 months → subtract 8 weeks, corrected present", () => {
  // chronological ~3 months; subtract (40-32)=8 weeks = 56 days of prematurity.
  const r = computePediatricAge("2025-03-12", new Date(2025, 5, 12), 32)
  assert.equal(r.status, "ok")
  assert.ok(r.corrected, "corrected field should be present for preterm infant")
  assert.equal(r.corrected?.appliesUntilMonths, 24)
  // corrected total days = chronological total days - 56
  // chronological 2025-03-12 → 2025-06-12 = 92 days; corrected = 36 days → weeks band.
  assert.equal(r.corrected?.band, "weeks")
  assert.deepEqual(r.corrected?.parts, { weeks: 5 })
})

test("preterm but corrected age past 24 months → no corrected field (stop correcting)", () => {
  // born well over 2 years ago; even minus prematurity, corrected > 24 months.
  const r = computePediatricAge("2022-01-01", new Date(2025, 5, 28), 32)
  assert.equal(r.corrected, undefined)
})

test("preterm with corrected age still within cutoff has its own band/parts", () => {
  // 34 weeks → subtract 6 weeks (42 days). Chronological 5 months.
  const r = computePediatricAge("2025-01-12", new Date(2025, 5, 12), 34)
  assert.ok(r.corrected)
  assert.ok(r.corrected?.band)
  assert.ok(r.corrected?.parts)
})

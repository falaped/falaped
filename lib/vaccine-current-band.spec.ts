import test from "node:test"
import assert from "node:assert/strict"

import {
  computeCurrentMonths,
  isBandCurrent,
} from "@/lib/vaccine-current-band"
import type { PediatricAge } from "@/lib/compute-pediatric-age"

const ok = (totalDays: number): PediatricAge => ({
  status: "ok",
  totalDays,
})

// ── computeCurrentMonths: only "ok" yields a number (D-02) ────────────────────

test("missing_birth_date → null", () => {
  assert.equal(computeCurrentMonths({ status: "missing_birth_date" }), null)
})

test("invalid → null", () => {
  assert.equal(computeCurrentMonths({ status: "invalid" }), null)
})

test("future → null", () => {
  assert.equal(computeCurrentMonths({ status: "future" }), null)
})

test("ok with 0 days → 0 months", () => {
  assert.equal(computeCurrentMonths(ok(0)), 0)
})

test("ok with ~2 months (61 days) → 2", () => {
  // 61 / 30.4375 = 2.004 → floor 2
  assert.equal(computeCurrentMonths(ok(61)), 2)
})

test("ok with ~12 months (365 days) → 11 (floor of 11.99)", () => {
  // 365 / 30.4375 = 11.99 → floor 11 (position-only; boundaries owned by isBandCurrent windows)
  assert.equal(computeCurrentMonths(ok(365)), 11)
})

test("ok with 366 days → 12", () => {
  assert.equal(computeCurrentMonths(ok(366)), 12)
})

test("ok with undefined totalDays → 0 (defensive)", () => {
  assert.equal(computeCurrentMonths({ status: "ok" }), 0)
})

// ── isBandCurrent: [age_months, age_months_max ?? age_months] window ──────────

test("null currentMonths → never current", () => {
  assert.equal(isBandCurrent(null, 2, null), false)
})

test("null age_months (unpositioned band) → never current", () => {
  assert.equal(isBandCurrent(2, null, null), false)
})

test("exact single-month band match", () => {
  assert.equal(isBandCurrent(2, 2, null), true)
})

test("single-month band mismatch", () => {
  assert.equal(isBandCurrent(3, 2, null), false)
})

test("ranged band: inside window (inclusive lower)", () => {
  assert.equal(isBandCurrent(12, 12, 15), true)
})

test("ranged band: inside window (inclusive upper)", () => {
  assert.equal(isBandCurrent(15, 12, 15), true)
})

test("ranged band: inside window (middle)", () => {
  assert.equal(isBandCurrent(13, 12, 15), true)
})

test("ranged band: below window", () => {
  assert.equal(isBandCurrent(11, 12, 15), false)
})

test("ranged band: above window", () => {
  assert.equal(isBandCurrent(16, 12, 15), false)
})

test("age_months_max null falls back to age_months (single point)", () => {
  assert.equal(isBandCurrent(4, 4, null), true)
  assert.equal(isBandCurrent(5, 4, null), false)
})

import test from "node:test"
import assert from "node:assert/strict"

import {
  resolveCurrentBandLabel,
  itemsForCurrentBand,
} from "@/lib/vaccine-current-band-items"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"

/** Minimal schedule factory — only the fields the pure helpers read. */
const schedule = (
  items: Array<{
    id: string
    vaccine: string
    age_months: number | null
    age_months_max: number | null
    age_label: string
    sort_order: number
  }>,
): VaccineScheduleWithItems => ({
  id: "sched-1",
  source: "SUS",
  axis: "child_age",
  version: "PNI 2025",
  effective_date: "2025-01-01",
  notes: null,
  vaccine_schedule_items: items.map((i) => ({
    dose: null,
    week_min: null,
    week_max: null,
    notes: null,
    ...i,
  })),
})

const sus = schedule([
  { id: "s1", vaccine: "BCG", age_months: 0, age_months_max: null, age_label: "Ao nascer", sort_order: 0 },
  { id: "s2", vaccine: "Penta", age_months: 2, age_months_max: null, age_label: "2 meses", sort_order: 1 },
  { id: "s3", vaccine: "VIP", age_months: 4, age_months_max: null, age_label: "4 meses", sort_order: 2 },
  { id: "s4", vaccine: "Tríplice viral", age_months: 14, age_months_max: null, age_label: "12 a 18 meses", sort_order: 3 },
])

const sbim = schedule([
  { id: "b1", vaccine: "Hexa", age_months: 2, age_months_max: null, age_label: "2 meses", sort_order: 1 },
])

// ── resolveCurrentBandLabel: canonical "faixa anterior" over the age only ─────

test("null currentMonths → null (standalone / invalid age)", () => {
  assert.equal(resolveCurrentBandLabel([sus, sbim], null), null)
})

test("currentMonths 2 → '2 meses'", () => {
  assert.equal(resolveCurrentBandLabel([sus, sbim], 2), "2 meses")
})

test("currentMonths 0 → 'Ao nascer'", () => {
  assert.equal(resolveCurrentBandLabel([sus, sbim], 0), "Ao nascer")
})

test("currentMonths 6 → '6 meses' (regression: NOT '5 meses')", () => {
  assert.equal(resolveCurrentBandLabel([sus, sbim], 6), "6 meses")
})

test("currentMonths 99 → '7 a 14 anos' (older child positions on last band)", () => {
  assert.equal(resolveCurrentBandLabel([sus, sbim], 99), "7 a 14 anos")
})

test("data-independent: null schedules do not affect resolution", () => {
  assert.equal(resolveCurrentBandLabel([null, null], 2), "2 meses")
})

// ── itemsForCurrentBand: groups by bandForItemMonths(age_months) ──

test("null bandLabel → empty list", () => {
  assert.deepEqual(itemsForCurrentBand(sus, null), [])
})

test("null schedule → empty list", () => {
  assert.deepEqual(itemsForCurrentBand(null, "2 meses"), [])
})

test("filters SUS to '2 meses' by age_months → only Penta (age_months 2)", () => {
  const items = itemsForCurrentBand(sus, "2 meses")
  assert.equal(items.length, 1)
  assert.equal(items[0].vaccine, "Penta")
})

test("filters SUS to '4 meses' by age_months → only VIP (age_months 4)", () => {
  const items = itemsForCurrentBand(sus, "4 meses")
  assert.equal(items.length, 1)
  assert.equal(items[0].vaccine, "VIP")
})

test("age_months 14 maps to '12 a 18 meses' band", () => {
  const items = itemsForCurrentBand(sus, "12 a 18 meses")
  assert.equal(items.length, 1)
  assert.equal(items[0].vaccine, "Tríplice viral")
})

test("filters SBIm to '4 meses' → empty (its only item is age_months 2)", () => {
  assert.deepEqual(itemsForCurrentBand(sbim, "4 meses"), [])
})

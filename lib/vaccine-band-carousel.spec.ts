import test from "node:test"
import assert from "node:assert/strict"

import {
  computeOrderedBands,
  resolveCurrentBandIndex,
} from "@/lib/vaccine-band-carousel"
import { CANONICAL_VACCINE_BANDS } from "@/lib/vaccine-bands"
import type { VaccineScheduleWithItems } from "@/modules/vaccines/types"

function item(
  id: string,
  age_label: string,
  sort_order: number,
  age_months: number | null,
  age_months_max: number | null = null,
) {
  return {
    id,
    vaccine: `V-${id}`,
    dose: null,
    age_months,
    age_months_max,
    week_min: null,
    week_max: null,
    age_label,
    sort_order,
    notes: null,
  }
}

function schedule(
  items: ReturnType<typeof item>[],
): VaccineScheduleWithItems {
  return {
    id: "s",
    source: "SUS",
    axis: "child_age",
    version: "v",
    effective_date: "2025-01-01",
    notes: null,
    vaccine_schedule_items: items,
  }
}

const CANONICAL_LABELS = CANONICAL_VACCINE_BANDS.map((b) => b.label)

test("computeOrderedBands returns the fixed 11 canonical labels in order", () => {
  const sus = schedule([
    item("a", "Ao nascer", 0, 0),
    item("b", "2 meses", 2, 2),
  ])
  const sbim = schedule([item("e", "3 meses", 3.5, 3)])
  assert.deepEqual(computeOrderedBands([sus, sbim]), CANONICAL_LABELS)
})

test("computeOrderedBands is data-independent: null datasets still yield the 11 bands", () => {
  assert.deepEqual(computeOrderedBands([null, null]), CANONICAL_LABELS)
  assert.deepEqual(computeOrderedBands([]), CANONICAL_LABELS)
})

test("resolveCurrentBandIndex returns the index of the current band label", () => {
  const bands = CANONICAL_LABELS
  assert.equal(resolveCurrentBandIndex(bands, "2 meses"), 1)
  assert.equal(resolveCurrentBandIndex(bands, "12 a 18 meses"), 8)
})

test("resolveCurrentBandIndex falls back to 0 when label is null or absent", () => {
  const bands = CANONICAL_LABELS
  assert.equal(resolveCurrentBandIndex(bands, null), 0)
  assert.equal(resolveCurrentBandIndex(bands, "9 anos"), 0)
})

test("resolveCurrentBandIndex returns 0 for an empty band list", () => {
  assert.equal(resolveCurrentBandIndex([], "2 meses"), 0)
})

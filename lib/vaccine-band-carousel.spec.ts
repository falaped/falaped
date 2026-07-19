import test from "node:test"
import assert from "node:assert/strict"

import {
  computeOrderedBands,
  resolveCurrentBandIndex,
} from "@/lib/vaccine-band-carousel"
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

test("computeOrderedBands unions distinct age_labels ordered by min sort_order", () => {
  const sus = schedule([
    item("a", "Ao nascer", 0, 0),
    item("b", "2 meses", 2, 2),
    item("c", "4 meses", 4, 4),
  ])
  const sbim = schedule([
    item("d", "2 meses", 3, 2), // higher sort_order for same label -> min wins
    item("e", "3 meses", 3.5, 3),
  ])
  const bands = computeOrderedBands([sus, sbim])
  assert.deepEqual(bands, ["Ao nascer", "2 meses", "3 meses", "4 meses"])
})

test("computeOrderedBands skips null datasets", () => {
  const sus = schedule([item("a", "Ao nascer", 0, 0)])
  assert.deepEqual(computeOrderedBands([sus, null]), ["Ao nascer"])
  assert.deepEqual(computeOrderedBands([null, null]), [])
})

test("resolveCurrentBandIndex returns the index of the current band label", () => {
  const bands = ["Ao nascer", "2 meses", "4 meses"]
  assert.equal(resolveCurrentBandIndex(bands, "2 meses"), 1)
  assert.equal(resolveCurrentBandIndex(bands, "4 meses"), 2)
})

test("resolveCurrentBandIndex falls back to 0 when label is null or absent", () => {
  const bands = ["Ao nascer", "2 meses"]
  assert.equal(resolveCurrentBandIndex(bands, null), 0)
  assert.equal(resolveCurrentBandIndex(bands, "9 anos"), 0)
})

test("resolveCurrentBandIndex returns 0 for an empty band list", () => {
  assert.equal(resolveCurrentBandIndex([], "2 meses"), 0)
})

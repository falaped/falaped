import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { updateMeasurement } from "@/modules/patient-growth/update-measurement"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const MEASUREMENT_ID = "33333333-3333-3333-3333-333333333333"

type EqCall = { column: string; value: unknown }

/**
 * SupabaseClient mock that records the values passed to `.update(...)` and the
 * `.eq()` filters applied to the patient_measurements UPDATE, so we can assert
 * the mutation is scoped by ALL THREE of id, profile_id and patient_id
 * (ownership backstop / IDOR defense — D-14, CONCERNS Pitfall 5) and that only
 * provided fields are written.
 */
function buildSupabaseMock(returnRow: unknown) {
  const updateEqCalls: EqCall[] = []
  let updateValues: Record<string, unknown> | null = null

  const client = {
    from(table: string) {
      let mode: "update" | "select" | null = null
      const builder = {
        update(values: Record<string, unknown>) {
          mode = "update"
          if (table === "patient_measurements") updateValues = values
          return builder
        },
        eq(column: string, value: unknown) {
          if (table === "patient_measurements" && mode === "update")
            updateEqCalls.push({ column, value })
          return builder
        },
        select(_cols: string) {
          mode = "select"
          return builder
        },
        single() {
          return Promise.resolve({ data: returnRow, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return {
    client,
    updateEqCalls,
    getUpdateValues: () => updateValues,
  }
}

const ROW = {
  id: MEASUREMENT_ID,
  profile_id: PROFILE_ID,
  patient_id: PATIENT_ID,
  measured_on: "2026-01-01",
  weight_grams: 12400,
  length_height_mm: null,
  head_circumference_mm: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

test("updateMeasurement scopes the update by id (ownership backstop)", async () => {
  const { client, updateEqCalls } = buildSupabaseMock(ROW)
  await updateMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID, {
    weight_grams: 12400,
  })

  assert.ok(
    updateEqCalls.some((c) => c.column === "id" && c.value === MEASUREMENT_ID),
    "update must be scoped by .eq('id', id)",
  )
})

test("updateMeasurement scopes the update by profile_id (IDOR guard)", async () => {
  const { client, updateEqCalls } = buildSupabaseMock(ROW)
  await updateMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID, {
    weight_grams: 12400,
  })

  assert.ok(
    updateEqCalls.some(
      (c) => c.column === "profile_id" && c.value === PROFILE_ID,
    ),
    "update must be scoped by .eq('profile_id', profileId) — never id alone",
  )
})

test("updateMeasurement scopes the update by patient_id (IDOR guard)", async () => {
  const { client, updateEqCalls } = buildSupabaseMock(ROW)
  await updateMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID, {
    weight_grams: 12400,
  })

  assert.ok(
    updateEqCalls.some(
      (c) => c.column === "patient_id" && c.value === PATIENT_ID,
    ),
    "update must be scoped by .eq('patient_id', patientId) — never id alone",
  )
})

test("updateMeasurement applies all three ownership .eq filters together", async () => {
  const { client, updateEqCalls } = buildSupabaseMock(ROW)
  await updateMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID, {
    weight_grams: 12400,
  })

  const columns = updateEqCalls.map((c) => c.column)
  assert.ok(columns.includes("id"), "missing id scope")
  assert.ok(columns.includes("profile_id"), "missing profile_id scope")
  assert.ok(columns.includes("patient_id"), "missing patient_id scope")
})

test("updateMeasurement only writes provided fields and always refreshes updated_at", async () => {
  const { client, getUpdateValues } = buildSupabaseMock(ROW)
  await updateMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID, {
    weight_grams: 13000,
  })

  const values = getUpdateValues()
  assert.ok(values, "update values must be captured")
  assert.equal(values!.weight_grams, 13000, "provided field must be written")
  assert.ok("updated_at" in values!, "updated_at must always be set")
  assert.ok(
    !("length_height_mm" in values!),
    "fields not provided must NOT be written (partial edit must not overwrite)",
  )
  assert.ok(
    !("head_circumference_mm" in values!),
    "fields not provided must NOT be written (partial edit must not overwrite)",
  )
})

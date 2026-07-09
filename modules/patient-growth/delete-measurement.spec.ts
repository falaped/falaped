import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { deleteMeasurement } from "@/modules/patient-growth/delete-measurement"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const MEASUREMENT_ID = "33333333-3333-3333-3333-333333333333"

type EqCall = { column: string; value: unknown }

/**
 * SupabaseClient mock that records the `.eq()` filters applied to the
 * patient_measurements DELETE, so we can assert the mutation is scoped by ALL
 * THREE of id, profile_id and patient_id (ownership backstop / IDOR defense —
 * D-14, CONCERNS Pitfall 5). A delete scoped by id alone is the exact
 * exploitable bug this test guards against.
 */
function buildSupabaseMock() {
  const deleteEqCalls: EqCall[] = []

  const client = {
    from(table: string) {
      let mode: "delete" | null = null
      const builder = {
        delete() {
          mode = "delete"
          return builder
        },
        eq(column: string, value: unknown) {
          if (table === "patient_measurements" && mode === "delete")
            deleteEqCalls.push({ column, value })
          return builder
        },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          resolve({ data: null, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, deleteEqCalls }
}

test("deleteMeasurement scopes the delete by id (ownership backstop)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await deleteMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID)

  assert.ok(
    deleteEqCalls.some((c) => c.column === "id" && c.value === MEASUREMENT_ID),
    "delete must be scoped by .eq('id', id)",
  )
})

test("deleteMeasurement scopes the delete by profile_id (IDOR guard)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await deleteMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID)

  assert.ok(
    deleteEqCalls.some(
      (c) => c.column === "profile_id" && c.value === PROFILE_ID,
    ),
    "delete must be scoped by .eq('profile_id', profileId) — never id alone",
  )
})

test("deleteMeasurement scopes the delete by patient_id (IDOR guard)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await deleteMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID)

  assert.ok(
    deleteEqCalls.some(
      (c) => c.column === "patient_id" && c.value === PATIENT_ID,
    ),
    "delete must be scoped by .eq('patient_id', patientId) — never id alone",
  )
})

test("deleteMeasurement applies all three ownership .eq filters together", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await deleteMeasurement(client, MEASUREMENT_ID, PROFILE_ID, PATIENT_ID)

  const columns = deleteEqCalls.map((c) => c.column)
  assert.ok(columns.includes("id"), "missing id scope")
  assert.ok(columns.includes("profile_id"), "missing profile_id scope")
  assert.ok(columns.includes("patient_id"), "missing patient_id scope")
})

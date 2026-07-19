import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { unmarkDoseTaken } from "@/modules/patient-vaccine-doses/unmark-dose-taken"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const ITEM_ID = "44444444-4444-4444-4444-444444444444"

type EqCall = { column: string; value: unknown }

/**
 * SupabaseClient mock recording the `.eq()` filters on the patient_vaccine_doses
 * DELETE, so we can assert the unmark is scoped by ALL THREE of profile_id,
 * patient_id and schedule_item_id (IDOR defense — D-14). A delete scoped by
 * schedule_item_id alone is the exploitable bug this guards against.
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
          if (table === "patient_vaccine_doses" && mode === "delete")
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

test("scopes the delete by profile_id (IDOR guard)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await unmarkDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID)
  assert.ok(
    deleteEqCalls.some(
      (c) => c.column === "profile_id" && c.value === PROFILE_ID,
    ),
    "delete must be scoped by .eq('profile_id', profileId)",
  )
})

test("scopes the delete by patient_id (IDOR guard)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await unmarkDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID)
  assert.ok(
    deleteEqCalls.some((c) => c.column === "patient_id" && c.value === PATIENT_ID),
    "delete must be scoped by .eq('patient_id', patientId)",
  )
})

test("scopes the delete by schedule_item_id", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await unmarkDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID)
  assert.ok(
    deleteEqCalls.some(
      (c) => c.column === "schedule_item_id" && c.value === ITEM_ID,
    ),
    "delete must be scoped by .eq('schedule_item_id', scheduleItemId)",
  )
})

test("applies all three ownership .eq filters together (never item alone)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock()
  await unmarkDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID)
  const columns = deleteEqCalls.map((c) => c.column)
  assert.ok(columns.includes("profile_id"), "missing profile_id scope")
  assert.ok(columns.includes("patient_id"), "missing patient_id scope")
  assert.ok(columns.includes("schedule_item_id"), "missing schedule_item_id scope")
})

test("throws a [VACCINE_DOSES]-tagged error on Supabase failure", async () => {
  const client = {
    from() {
      const builder = {
        delete() {
          return builder
        },
        eq() {
          return builder
        },
        then(resolve: (r: { data: unknown; error: { message: string } }) => void) {
          resolve({ data: null, error: { message: "boom" } })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient
  await assert.rejects(
    () => unmarkDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID),
    /\[VACCINE_DOSES\].*boom/,
  )
})

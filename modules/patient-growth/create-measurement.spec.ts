import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getMeasurementsByPatient } from "@/modules/patient-growth/get-measurements-by-patient"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const OTHER_PATIENT_ID = "33333333-3333-3333-3333-333333333333"

type EqCall = { column: string; value: unknown }
type OrderCall = { column: string; ascending: boolean }

/**
 * SupabaseClient mock that records the `.eq()` filters and `.order()` applied to
 * the patient_measurements select, so we can assert the read is scoped by BOTH
 * profile_id and patient_id (ownership backstop / IDOR defense — D-14).
 */
function buildSupabaseMock(rows: unknown[]) {
  const eqCalls: EqCall[] = []
  const orderCalls: OrderCall[] = []

  const client = {
    from(_table: string) {
      const builder = {
        select(_cols: string) {
          return builder
        },
        eq(column: string, value: unknown) {
          eqCalls.push({ column, value })
          return builder
        },
        order(column: string, opts: { ascending: boolean }) {
          orderCalls.push({ column, ascending: opts.ascending })
          return Promise.resolve({ data: rows, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, eqCalls, orderCalls }
}

test("getMeasurementsByPatient scopes the read by BOTH profile_id and patient_id (ownership backstop)", async () => {
  const { client, eqCalls } = buildSupabaseMock([])
  await getMeasurementsByPatient(client, PROFILE_ID, PATIENT_ID)

  assert.ok(
    eqCalls.some((c) => c.column === "profile_id" && c.value === PROFILE_ID),
    "select must be scoped by .eq('profile_id', profileId)",
  )
  assert.ok(
    eqCalls.some((c) => c.column === "patient_id" && c.value === PATIENT_ID),
    "select must be scoped by .eq('patient_id', patientId)",
  )
})

test("getMeasurementsByPatient does not leak another patient's id into the filter", async () => {
  const { client, eqCalls } = buildSupabaseMock([])
  await getMeasurementsByPatient(client, PROFILE_ID, PATIENT_ID)

  assert.ok(
    !eqCalls.some((c) => c.value === OTHER_PATIENT_ID),
    "no filter must reference a patient the caller did not request",
  )
})

test("getMeasurementsByPatient orders by measured_on ascending", async () => {
  const { client, orderCalls } = buildSupabaseMock([])
  await getMeasurementsByPatient(client, PROFILE_ID, PATIENT_ID)

  assert.ok(
    orderCalls.some((c) => c.column === "measured_on" && c.ascending === true),
    "read must order by measured_on ascending",
  )
})

test("getMeasurementsByPatient returns an empty array when there are no rows", async () => {
  const { client } = buildSupabaseMock([])
  const result = await getMeasurementsByPatient(client, PROFILE_ID, PATIENT_ID)

  assert.deepEqual(result, [])
})

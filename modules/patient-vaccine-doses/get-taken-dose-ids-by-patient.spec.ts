import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getTakenDoseIdsByPatient } from "@/modules/patient-vaccine-doses/get-taken-dose-ids-by-patient"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"

type EqCall = { column: string; value: unknown }

/**
 * SupabaseClient mock recording the `.eq()` filters applied to the
 * patient_vaccine_doses SELECT, so we can assert the read is scoped by BOTH
 * profile_id and patient_id (IDOR defense — D-14). The builder resolves via
 * `then` (the module awaits the query directly, no terminal method).
 */
function buildSupabaseMock(rows: Array<{ schedule_item_id: string }>) {
  const selectEqCalls: EqCall[] = []
  const fromArgs: string[] = []

  const client = {
    from(table: string) {
      fromArgs.push(table)
      const builder = {
        select() {
          return builder
        },
        eq(column: string, value: unknown) {
          selectEqCalls.push({ column, value })
          return builder
        },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          resolve({ data: rows, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, selectEqCalls, fromArgs }
}

test("reads from patient_vaccine_doses", async () => {
  const { client, fromArgs } = buildSupabaseMock([])
  await getTakenDoseIdsByPatient(client, PROFILE_ID, PATIENT_ID)
  assert.ok(fromArgs.includes("patient_vaccine_doses"))
})

test("scopes the read by profile_id (IDOR guard)", async () => {
  const { client, selectEqCalls } = buildSupabaseMock([])
  await getTakenDoseIdsByPatient(client, PROFILE_ID, PATIENT_ID)
  assert.ok(
    selectEqCalls.some(
      (c) => c.column === "profile_id" && c.value === PROFILE_ID,
    ),
    "read must be scoped by .eq('profile_id', profileId)",
  )
})

test("scopes the read by patient_id (IDOR guard)", async () => {
  const { client, selectEqCalls } = buildSupabaseMock([])
  await getTakenDoseIdsByPatient(client, PROFILE_ID, PATIENT_ID)
  assert.ok(
    selectEqCalls.some(
      (c) => c.column === "patient_id" && c.value === PATIENT_ID,
    ),
    "read must be scoped by .eq('patient_id', patientId) — never patient alone",
  )
})

test("returns a Set of taken schedule_item_ids", async () => {
  const { client } = buildSupabaseMock([
    { schedule_item_id: "a" },
    { schedule_item_id: "b" },
    { schedule_item_id: "a" },
  ])
  const result = await getTakenDoseIdsByPatient(client, PROFILE_ID, PATIENT_ID)
  assert.ok(result instanceof Set)
  assert.equal(result.size, 2)
  assert.ok(result.has("a"))
  assert.ok(result.has("b"))
})

test("returns an empty Set when no doses are taken", async () => {
  const { client } = buildSupabaseMock([])
  const result = await getTakenDoseIdsByPatient(client, PROFILE_ID, PATIENT_ID)
  assert.equal(result.size, 0)
})

test("throws a [VACCINE_DOSES]-tagged error on Supabase failure", async () => {
  const client = {
    from() {
      const builder = {
        select() {
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
    () => getTakenDoseIdsByPatient(client, PROFILE_ID, PATIENT_ID),
    /\[VACCINE_DOSES\].*boom/,
  )
})

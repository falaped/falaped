import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getScaleResultsByPatient } from "@/modules/patient-scales/get-scale-results-by-patient"
import { deleteScaleResult } from "@/modules/patient-scales/delete-scale-result"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const RESULT_ID = "33333333-3333-3333-3333-333333333333"

type EqCall = { column: string; value: unknown }

/** Mock que registra os `.eq()` aplicados, para provar o escopo por dono. */
function buildSelectMock(rows: unknown[], error: { message: string } | null = null) {
  const eqCalls: EqCall[] = []
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
        order(_column: string, _opts: { ascending: boolean }) {
          return Promise.resolve({ data: rows, error })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient
  return { client, eqCalls }
}

test("getScaleResultsByPatient escopa a leitura por profile_id E patient_id", async () => {
  const { client, eqCalls } = buildSelectMock([])
  await getScaleResultsByPatient(client, PROFILE_ID, PATIENT_ID)

  assert.deepEqual(eqCalls, [
    { column: "profile_id", value: PROFILE_ID },
    { column: "patient_id", value: PATIENT_ID },
  ])
})

test("getScaleResultsByPatient lança erro com a tag [SCALES]", async () => {
  const { client } = buildSelectMock([], { message: "boom" })
  await assert.rejects(
    () => getScaleResultsByPatient(client, PROFILE_ID, PATIENT_ID),
    /\[SCALES\] Failed to list scale results by patient: boom/,
  )
})

test("deleteScaleResult filtra por id E profile_id (id de outro médico não apaga)", async () => {
  const eqCalls: EqCall[] = []
  const client = {
    from(_table: string) {
      const builder = {
        delete() {
          return builder
        },
        eq(column: string, value: unknown) {
          eqCalls.push({ column, value })
          return eqCalls.length === 2
            ? Promise.resolve({ error: null })
            : builder
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  await deleteScaleResult(client, PROFILE_ID, RESULT_ID)
  assert.deepEqual(eqCalls, [
    { column: "id", value: RESULT_ID },
    { column: "profile_id", value: PROFILE_ID },
  ])
})

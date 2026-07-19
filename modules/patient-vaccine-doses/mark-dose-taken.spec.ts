import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { markDoseTaken } from "@/modules/patient-vaccine-doses/mark-dose-taken"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const ITEM_ID = "44444444-4444-4444-4444-444444444444"

type UpsertCall = { row: Record<string, unknown>; options: unknown }

/**
 * SupabaseClient mock recording the upsert payload + options on
 * patient_vaccine_doses, so we can assert the mark is stamped with the owner's
 * profile_id + patient_id and is idempotent (ignoreDuplicates on the unique
 * mark constraint).
 */
function buildSupabaseMock() {
  const upsertCalls: UpsertCall[] = []
  const fromArgs: string[] = []

  const client = {
    from(table: string) {
      fromArgs.push(table)
      const builder = {
        upsert(row: Record<string, unknown>, options: unknown) {
          upsertCalls.push({ row, options })
          return builder
        },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          resolve({ data: null, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, upsertCalls, fromArgs }
}

test("upserts into patient_vaccine_doses", async () => {
  const { client, fromArgs } = buildSupabaseMock()
  await markDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID)
  assert.ok(fromArgs.includes("patient_vaccine_doses"))
})

test("stamps the mark with profile_id + patient_id + schedule_item_id", async () => {
  const { client, upsertCalls } = buildSupabaseMock()
  await markDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID)
  assert.equal(upsertCalls.length, 1)
  assert.equal(upsertCalls[0].row.profile_id, PROFILE_ID)
  assert.equal(upsertCalls[0].row.patient_id, PATIENT_ID)
  assert.equal(upsertCalls[0].row.schedule_item_id, ITEM_ID)
})

test("is idempotent (ignoreDuplicates on the unique mark constraint)", async () => {
  const { client, upsertCalls } = buildSupabaseMock()
  await markDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID)
  const options = upsertCalls[0].options as {
    onConflict?: string
    ignoreDuplicates?: boolean
  }
  assert.equal(options.onConflict, "profile_id,patient_id,schedule_item_id")
  assert.equal(options.ignoreDuplicates, true)
})

test("throws a [VACCINE_DOSES]-tagged error on Supabase failure", async () => {
  const client = {
    from() {
      const builder = {
        upsert() {
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
    () => markDoseTaken(client, PROFILE_ID, PATIENT_ID, ITEM_ID),
    /\[VACCINE_DOSES\].*boom/,
  )
})

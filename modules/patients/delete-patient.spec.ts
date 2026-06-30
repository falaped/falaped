import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { deletePatient } from "@/modules/patients/delete-patient"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const PHOTO_PATH = `${PROFILE_ID}/${PATIENT_ID}.jpg`

type RemoveCall = { bucket: string; paths: string[] }
type DeleteEqCall = { column: string; value: unknown }

/**
 * SupabaseClient mock that records:
 * - the `photo_path` returned by the owner-scoped select
 * - any storage `.remove([...])` calls (bucket + paths)
 * - the `.eq()` filters applied to the patients DELETE (ownership backstop)
 */
function buildSupabaseMock(photoPath: string | null) {
  const removeCalls: RemoveCall[] = []
  const deleteEqCalls: DeleteEqCall[] = []

  const client = {
    from(table: string) {
      let mode: "update" | "select" | "delete" | null = null
      const builder = {
        update(_values: Record<string, unknown>) {
          mode = "update"
          return builder
        },
        select(_cols: string) {
          mode = "select"
          return builder
        },
        delete() {
          mode = "delete"
          return builder
        },
        eq(column: string, value: unknown) {
          if (table === "patients" && mode === "delete")
            deleteEqCalls.push({ column, value })
          return builder
        },
        maybeSingle() {
          return Promise.resolve({
            data: photoPath ? { photo_path: photoPath } : { photo_path: null },
            error: null,
          })
        },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          resolve({ data: null, error: null })
        },
      }
      return builder
    },
    storage: {
      from(bucket: string) {
        return {
          remove(paths: string[]) {
            removeCalls.push({ bucket, paths })
            return Promise.resolve({ data: [], error: null })
          },
        }
      },
    },
  } as unknown as SupabaseClient

  return { client, removeCalls, deleteEqCalls }
}

test("deletePatient removes the storage object when the patient has a photo_path", async () => {
  const { client, removeCalls } = buildSupabaseMock(PHOTO_PATH)
  await deletePatient(client, PATIENT_ID, PROFILE_ID)

  assert.equal(removeCalls.length, 1, "storage.remove must be called once")
  assert.equal(removeCalls[0].bucket, PATIENT_PHOTOS_BUCKET)
  assert.deepEqual(
    removeCalls[0].paths,
    [PHOTO_PATH],
    "remove must target the stored photo path",
  )
})

test("deletePatient skips storage.remove when photo_path is null (idempotent no-op)", async () => {
  const { client, removeCalls } = buildSupabaseMock(null)
  await deletePatient(client, PATIENT_ID, PROFILE_ID)

  assert.equal(
    removeCalls.length,
    0,
    "storage.remove must NOT be called when there is no photo",
  )
})

test("deletePatient scopes the row delete by BOTH id and profile_id (ownership backstop)", async () => {
  const { client, deleteEqCalls } = buildSupabaseMock(PHOTO_PATH)
  await deletePatient(client, PATIENT_ID, PROFILE_ID)

  assert.ok(
    deleteEqCalls.some((c) => c.column === "id" && c.value === PATIENT_ID),
    "row delete must be scoped by .eq('id', patientId)",
  )
  assert.ok(
    deleteEqCalls.some(
      (c) => c.column === "profile_id" && c.value === PROFILE_ID,
    ),
    "row delete must be scoped by .eq('profile_id', profileId)",
  )
})

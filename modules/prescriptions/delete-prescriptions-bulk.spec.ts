import test from "node:test"
import assert from "node:assert/strict"

import type { SupabaseClient } from "@supabase/supabase-js"

import { deletePrescriptionsBulk } from "@/modules/prescriptions/delete-prescriptions-bulk"

// Spy mock: tracks number of times .delete() and .remove() are invoked
function makeSpySupabase({
  dbError = null as { message: string } | null,
  storageError = null as { message: string } | null,
  onDbCall = () => {},
  onStorageCall = () => {},
} = {}) {
  return {
    from: (_table: string) => ({
      delete: (_opts?: object) => {
        onDbCall()
        return {
          in: (_col: string, _vals: string[]) => ({
            eq: (_col2: string, _val2: string) =>
              Promise.resolve({ error: dbError, count: dbError ? null : _vals.length }),
          }),
        }
      },
    }),
    storage: {
      from: (_bucket: string) => ({
        remove: (_paths: string[]) => {
          onStorageCall()
          return Promise.resolve({ error: storageError })
        },
      }),
    },
  } as unknown as SupabaseClient
}

// SEC-04: bulk delete of N items must issue exactly one DB call and one storage call
test("deletePrescriptionsBulk makes exactly one DB call and one storage call for 10 ids", async () => {
  let dbCallCount = 0
  let storageCallCount = 0
  const ids = Array.from({ length: 10 }, (_, i) => `id-${i}`)
  const paths = Array.from({ length: 10 }, (_, i) => `path/to/file-${i}.pdf`)
  const supabase = makeSpySupabase({
    onDbCall: () => { dbCallCount++ },
    onStorageCall: () => { storageCallCount++ },
  })
  await deletePrescriptionsBulk(supabase, ids, "profile-id", paths)
  assert.equal(dbCallCount, 1)
  assert.equal(storageCallCount, 1)
})

// Empty array: returns { deletedCount: 0 } and makes zero storage calls
test("deletePrescriptionsBulk returns { deletedCount: 0 } and makes zero calls for empty input", async () => {
  let dbCallCount = 0
  let storageCallCount = 0
  const supabase = makeSpySupabase({
    onDbCall: () => { dbCallCount++ },
    onStorageCall: () => { storageCallCount++ },
  })
  const result = await deletePrescriptionsBulk(supabase, [], "profile-id", [])
  assert.deepEqual(result, { deletedCount: 0 })
  assert.equal(dbCallCount, 0)
  assert.equal(storageCallCount, 0)
})

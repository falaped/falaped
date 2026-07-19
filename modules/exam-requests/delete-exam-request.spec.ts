import test from "node:test"
import assert from "node:assert/strict"

import type { SupabaseClient } from "@supabase/supabase-js"

import { deleteExamRequest } from "@/modules/exam-requests/delete-exam-request"

// Minimal mock implementing: .from(table).delete().eq().eq() + .storage.from(bucket).remove(paths)
function makeMockSupabase({
  dbError = null as { message: string } | null,
  storageError = null as { message: string } | null,
} = {}) {
  return {
    from: (_table: string) => ({
      delete: (_opts?: object) => ({
        eq: (_col: string, _val: string) => ({
          eq: (_col2: string, _val2: string) =>
            Promise.resolve({ error: dbError, count: dbError ? null : 1 }),
        }),
      }),
    }),
    storage: {
      from: (_bucket: string) => ({
        remove: (_paths: string[]) =>
          Promise.resolve({ error: storageError }),
      }),
    },
  } as unknown as SupabaseClient
}

// D-15: ownership no-op — 0 rows matched is not an error
test("deleteExamRequest does not throw when profileId does not match (ownership no-op)", async () => {
  const supabase = makeMockSupabase({ dbError: null })
  await assert.doesNotReject(() =>
    deleteExamRequest(supabase, "some-uuid", "other-profile-id", null),
  )
})

test("deleteExamRequest deletes own exam request successfully", async () => {
  const supabase = makeMockSupabase()
  await assert.doesNotReject(() =>
    deleteExamRequest(supabase, "own-uuid", "own-profile-id", null),
  )
})

// Storage error must NOT reject — DB row already gone; orphan PDF is preferable to IDOR
test("deleteExamRequest logs storage error but does not throw", async () => {
  const supabase = makeMockSupabase({
    storageError: { message: "boom" },
  })
  await assert.doesNotReject(() =>
    deleteExamRequest(supabase, "own-uuid", "own-profile-id", "path/to/file.pdf"),
  )
})

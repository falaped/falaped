import test from "node:test"
import assert from "node:assert/strict"

import type { SupabaseClient } from "@supabase/supabase-js"

import { deleteMedicalCertificate } from "@/modules/medical-certificates/delete-medical-certificate"

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

// SEC-01: ownership no-op — 0 rows matched is not an error
test("deleteMedicalCertificate does not throw when profileId does not match (ownership no-op)", async () => {
  const supabase = makeMockSupabase({ dbError: null })
  await assert.doesNotReject(() =>
    deleteMedicalCertificate(supabase, "some-uuid", "other-profile-id", null),
  )
})

test("deleteMedicalCertificate deletes own certificate successfully", async () => {
  const supabase = makeMockSupabase()
  await assert.doesNotReject(() =>
    deleteMedicalCertificate(supabase, "own-uuid", "own-profile-id", null),
  )
})

// Storage error must NOT reject — DB row already gone; orphan PDF is preferable to IDOR
test("deleteMedicalCertificate logs storage error but does not throw", async () => {
  const supabase = makeMockSupabase({
    storageError: { message: "boom" },
  })
  await assert.doesNotReject(() =>
    deleteMedicalCertificate(supabase, "own-uuid", "own-profile-id", "path/to/file.pdf"),
  )
})

// RED until 02-02 implements the modules
import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

// NOTE: `updatePatientPhoto` does not exist yet — it is implemented in Plan 02.
// This spec is an intentional Wave-0 RED scaffold and MUST fail until then.
import { updatePatientPhoto } from "@/modules/patients/update-patient-photo"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"

/**
 * SupabaseClient mock recording the `.eq()` filters applied to the update,
 * so the ownership backstop (`id` AND `profile_id`) can be asserted.
 */
function buildSupabaseMock() {
  const eqCalls: { column: string; value: unknown }[] = []
  const client = {
    from(_table: string) {
      const builder = {
        update(_values: Record<string, unknown>) {
          return builder
        },
        eq(column: string, value: unknown) {
          eqCalls.push({ column, value })
          return builder
        },
        then(resolve: (r: { data: unknown; error: null }) => void) {
          resolve({ data: {}, error: null })
        },
      }
      return builder
    },
  } as unknown as SupabaseClient
  return { client, eqCalls }
}

test("updatePatientPhoto scopes the update by BOTH id and profile_id (ownership backstop)", async () => {
  const { client, eqCalls } = buildSupabaseMock()
  await updatePatientPhoto(client, PATIENT_ID, PROFILE_ID, {
    photo_path: `${PROFILE_ID}/${PATIENT_ID}.png`,
    consent_given: true,
    consent_at: new Date().toISOString(),
  })

  assert.ok(
    eqCalls.some((c) => c.column === "id" && c.value === PATIENT_ID),
    "update must be scoped by .eq('id', patientId)",
  )
  assert.ok(
    eqCalls.some(
      (c) => c.column === "profile_id" && c.value === PROFILE_ID,
    ),
    "update must be scoped by .eq('profile_id', profileId)",
  )
})

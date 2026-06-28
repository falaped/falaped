// RED until 02-02 implements the modules
import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

// NOTE: `uploadPatientPhoto` does not exist yet — it is implemented in Plan 02.
// These specs are an intentional Wave-0 RED scaffold and MUST fail until then.
import { uploadPatientPhoto } from "@/modules/patients/upload-patient-photo"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"

/** Minimal SupabaseClient mock recording the storage upload call. */
function buildSupabaseMock() {
  const calls: { path: string; contentType?: string }[] = []
  const client = {
    storage: {
      from(_bucket: string) {
        return {
          upload(
            path: string,
            _blob: Blob,
            opts?: { contentType?: string },
          ) {
            calls.push({ path, contentType: opts?.contentType })
            return Promise.resolve({ data: { path }, error: null })
          },
        }
      },
    },
  } as unknown as SupabaseClient
  return { client, calls }
}

test("uploadPatientPhoto rejects image/svg+xml (XSS vector)", async () => {
  const { client } = buildSupabaseMock()
  const svg = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" })
  await assert.rejects(
    () => uploadPatientPhoto(client, PROFILE_ID, PATIENT_ID, svg),
    /\[PATIENTS\]/,
  )
})

test("uploadPatientPhoto rejects a blob larger than the 2 MB limit", async () => {
  const { client } = buildSupabaseMock()
  const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", {
    type: "image/png",
  })
  await assert.rejects(
    () => uploadPatientPhoto(client, PROFILE_ID, PATIENT_ID, big),
    /\[PATIENTS\]/,
  )
})

test("uploadPatientPhoto accepts a valid png and returns a path prefixed by profileId", async () => {
  const { client } = buildSupabaseMock()
  const png = new File([new Uint8Array(1024)], "photo.png", {
    type: "image/png",
  })
  const path = await uploadPatientPhoto(client, PROFILE_ID, PATIENT_ID, png)
  assert.ok(
    path.startsWith(`${PROFILE_ID}/`),
    `expected path to start with ${PROFILE_ID}/, got ${path}`,
  )
})

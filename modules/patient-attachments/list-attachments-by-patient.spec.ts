import test from "node:test"
import assert from "node:assert/strict"
import type { SupabaseClient } from "@supabase/supabase-js"

import { listAttachmentsByPatient } from "@/modules/patient-attachments/list-attachments-by-patient"
import { uploadAttachmentFile } from "@/modules/patient-attachments/upload-attachment-file"
import { PATIENT_ATTACHMENT_MAX_BYTES } from "@/lib/constants"

const PROFILE_ID = "11111111-1111-1111-1111-111111111111"
const PATIENT_ID = "22222222-2222-2222-2222-222222222222"
const ATTACHMENT_ID = "33333333-3333-3333-3333-333333333333"

type EqCall = { column: string; value: unknown }

test("listAttachmentsByPatient escopa a leitura por profile_id E patient_id", async () => {
  const eqCalls: EqCall[] = []
  const client = {
    from(_table: string) {
      const builder = {
        select: (_c: string) => builder,
        eq(column: string, value: unknown) {
          eqCalls.push({ column, value })
          return builder
        },
        order: () => Promise.resolve({ data: [], error: null }),
      }
      return builder
    },
  } as unknown as SupabaseClient

  await listAttachmentsByPatient(client, PROFILE_ID, PATIENT_ID)
  assert.deepEqual(eqCalls, [
    { column: "profile_id", value: PROFILE_ID },
    { column: "patient_id", value: PATIENT_ID },
  ])
})

/** Mock de storage que só registra o path recebido no upload. */
function buildStorageMock() {
  const uploads: string[] = []
  const client = {
    storage: {
      from(_bucket: string) {
        return {
          upload(path: string) {
            uploads.push(path)
            return Promise.resolve({ error: null })
          },
        }
      },
    },
  } as unknown as SupabaseClient
  return { client, uploads }
}

test("o path do anexo é montado com ids, nunca com o nome do arquivo", async () => {
  const { client, uploads } = buildStorageMock()
  const file = new File(["conteudo"], "../../exame do João (2).pdf", {
    type: "application/pdf",
  })

  const path = await uploadAttachmentFile(
    client,
    PROFILE_ID,
    PATIENT_ID,
    ATTACHMENT_ID,
    file,
  )

  assert.equal(path, `${PROFILE_ID}/${PATIENT_ID}/${ATTACHMENT_ID}.pdf`)
  assert.deepEqual(uploads, [path])
  assert.ok(!path.includes(".."))
  assert.ok(!path.includes(" "))
})

test("arquivo sem extensão sobe sem extensão no path", async () => {
  const { client } = buildStorageMock()
  const file = new File(["x"], "exame", { type: "application/octet-stream" })
  const path = await uploadAttachmentFile(
    client,
    PROFILE_ID,
    PATIENT_ID,
    ATTACHMENT_ID,
    file,
  )
  assert.equal(path, `${PROFILE_ID}/${PATIENT_ID}/${ATTACHMENT_ID}`)
})

test("arquivo vazio e acima do teto são recusados antes de tocar no storage", async () => {
  const { client, uploads } = buildStorageMock()

  await assert.rejects(
    () =>
      uploadAttachmentFile(
        client,
        PROFILE_ID,
        PATIENT_ID,
        ATTACHMENT_ID,
        new File([], "vazio.pdf"),
      ),
    /\[ATTACHMENTS\] Arquivo vazio/,
  )

  const big = new File(["x"], "grande.pdf")
  Object.defineProperty(big, "size", {
    value: PATIENT_ATTACHMENT_MAX_BYTES + 1,
  })
  await assert.rejects(
    () =>
      uploadAttachmentFile(client, PROFILE_ID, PATIENT_ID, ATTACHMENT_ID, big),
    /\[ATTACHMENTS\] Arquivo muito grande/,
  )

  assert.deepEqual(uploads, [])
})

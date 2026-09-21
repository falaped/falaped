"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { PATIENT_ATTACHMENT_MAX_BYTES } from "@/lib/constants"
import { findOwnedCaseId } from "@/modules/cases/find-owned-case-id"
import { getPatientById } from "@/modules/patients/get-patient-by-id"
import { createAttachment } from "@/modules/patient-attachments/create-attachment"
import { uploadAttachmentFile } from "@/modules/patient-attachments/upload-attachment-file"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type UploadAttachmentResult =
  | { ok: true; attachmentId: string }
  | { ok: false; error: string }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Anexa um arquivo a um paciente (e, opcionalmente, ao atendimento em curso).
 *
 * A posse do paciente e do caso é confirmada ANTES do upload: a RLS ancora em
 * `profile_id` e não olha para `patients`/`cases`, então o id que chega do
 * browser é superfície de IDOR que só a action fecha. O id do anexo é gerado
 * aqui e usado tanto no path do storage quanto na linha, para não existir
 * arquivo sem dono.
 */
export async function uploadAttachmentAction(
  formData: FormData,
): Promise<UploadAttachmentResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  const patientId = String(formData.get("patientId") ?? "")
  const rawCaseId = formData.get("caseId")
  const caseId =
    typeof rawCaseId === "string" && rawCaseId.trim() !== "" ? rawCaseId : null
  const file = formData.get("file")

  if (!UUID_RE.test(patientId))
    return { ok: false, error: "Paciente inválido." }
  if (caseId !== null && !UUID_RE.test(caseId))
    return { ok: false, error: "Atendimento inválido." }
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Selecione um arquivo." }
  if (file.size > PATIENT_ATTACHMENT_MAX_BYTES)
    return {
      ok: false,
      error: "Arquivo muito grande. O limite por anexo é de 20 MB.",
    }

  try {
    const patient = await getPatientById(supabase, patientId, profile.id)
    if (!patient) return { ok: false, error: "Paciente não encontrado." }

    if (caseId) {
      const ownedCaseId = await findOwnedCaseId(supabase, caseId, profile.id)
      if (!ownedCaseId)
        return { ok: false, error: "Atendimento não encontrado." }
    }

    const attachmentId = randomUUID()
    const storagePath = await uploadAttachmentFile(
      supabase,
      profile.id,
      patientId,
      attachmentId,
      file,
    )

    await createAttachment(supabase, profile.id, attachmentId, {
      patient_id: patientId,
      case_id: caseId,
      storage_path: storagePath,
      file_name: file.name || "arquivo",
      mime_type: file.type || null,
      size_bytes: file.size,
    })

    revalidatePath(`/dashboard/patients/${patientId}`)
    if (caseId) revalidatePath(`/dashboard/cases/${caseId}`)

    return { ok: true, attachmentId }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao anexar o arquivo. Tente novamente."
    return { ok: false, error: message }
  }
}

"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { deleteAttachment } from "@/modules/patient-attachments/delete-attachment"
import { getAttachmentById } from "@/modules/patient-attachments/get-attachment-by-id"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type DeleteAttachmentResult =
  | { ok: true }
  | { ok: false; error: string }

/** Apaga um anexo (arquivo + registro) do médico logado. */
export async function deleteAttachmentAction(
  id: string,
): Promise<DeleteAttachmentResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid")
    return {
      ok: false,
      error: "Perfil não ativo. Conclua a configuração da conta em Perfil.",
    }

  try {
    const attachment = await getAttachmentById(supabase, profile.id, id)
    if (!attachment) return { ok: false, error: "Anexo não encontrado." }

    await deleteAttachment(
      supabase,
      profile.id,
      attachment.id,
      attachment.storage_path,
    )

    revalidatePath(`/dashboard/patients/${attachment.patient_id}`)
    if (attachment.case_id)
      revalidatePath(`/dashboard/cases/${attachment.case_id}`)

    return { ok: true }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao apagar o anexo. Tente novamente."
    return { ok: false, error: message }
  }
}

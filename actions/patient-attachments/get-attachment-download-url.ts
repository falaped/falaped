"use server"

import { createClient } from "@/lib/supabase/server"
import { getAttachmentById } from "@/modules/patient-attachments/get-attachment-by-id"
import { getAttachmentSignedUrl } from "@/modules/patient-attachments/get-attachment-signed-url"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type GetAttachmentDownloadUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Resolve uma URL de download de curta duração para um anexo do médico logado.
 * A URL é assinada na hora e nunca persistida; a assinatura força download.
 */
export async function getAttachmentDownloadUrlAction(
  id: string,
): Promise<GetAttachmentDownloadUrlResult> {
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

    const url = await getAttachmentSignedUrl(
      supabase,
      attachment.storage_path,
      attachment.file_name,
    )
    if (!url) return { ok: false, error: "Não foi possível abrir o anexo." }

    return { ok: true, url }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao abrir o anexo. Tente novamente."
    return { ok: false, error: message }
  }
}

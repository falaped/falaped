"use server"

import { createClient } from "@/lib/supabase/server"
import { buildAttachmentDownloadName } from "@/lib/attachment-download-name"
import { isInlineViewableMimeType } from "@/lib/attachment-inline-view"
import { getAttachmentById } from "@/modules/patient-attachments/get-attachment-by-id"
import { getAttachmentSignedUrl } from "@/modules/patient-attachments/get-attachment-signed-url"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export type GetAttachmentUrlResult =
  | { ok: true; url: string; inline: boolean }
  | { ok: false; error: string }

/** Mantido para compatibilidade com o nome antigo do resultado. */
export type GetAttachmentDownloadUrlResult = GetAttachmentUrlResult

/**
 * Resolve uma URL de curta duração para um anexo do médico logado. A URL é
 * assinada na hora e nunca persistida.
 *
 * `mode: "inline"` abre numa aba — mas SÓ para tipo da allowlist
 * (`lib/attachment-inline-view.ts`). Pedido de inline para tipo fora dela cai
 * para download em vez de ser recusado: a decisão é do servidor, e o cliente
 * pedir inline não faz um HTML abrir. O `inline` devolvido diz o que de fato
 * aconteceu.
 */
export async function getAttachmentDownloadUrlAction(
  id: string,
  mode: "download" | "inline" = "download",
): Promise<GetAttachmentUrlResult> {
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

    const inline =
      mode === "inline" && isInlineViewableMimeType(attachment.mime_type)

    const url = await getAttachmentSignedUrl(
      supabase,
      attachment.storage_path,
      buildAttachmentDownloadName(attachment.file_name, attachment.title),
      { inline },
    )
    if (!url) return { ok: false, error: "Não foi possível abrir o anexo." }

    return { ok: true, url, inline }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao abrir o anexo. Tente novamente."
    return { ok: false, error: message }
  }
}

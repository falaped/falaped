import type { SupabaseClient } from "@supabase/supabase-js"

import {
  PATIENT_ATTACHMENTS_BUCKET,
  PATIENT_ATTACHMENT_MAX_BYTES,
} from "@/lib/constants"

/**
 * Sobe o arquivo para o bucket privado e devolve o PATH do objeto.
 *
 * QUALQUER tipo de arquivo é aceito, por decisão do gestor — é um repositório de
 * referência do médico, não um formato específico. O que segura o risco não é
 * allowlist de mime: é o bucket ser privado e a signed URL sempre forçar
 * download, então nada é renderizado inline pelo navegador.
 *
 * O nome original NÃO entra no path (vai para a coluna `file_name`): path é
 * `{profileId}/{patientId}/{attachmentId}.{ext}`, sem acento, espaço ou `../`
 * vindos do cliente. O prefixo `profileId/` É o escopo da RLS de storage.
 */
export async function uploadAttachmentFile(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  attachmentId: string,
  file: File,
): Promise<string> {
  if (file.size === 0)
    throw new Error("[ATTACHMENTS] Arquivo vazio.")
  if (file.size > PATIENT_ATTACHMENT_MAX_BYTES)
    throw new Error(
      "[ATTACHMENTS] Arquivo muito grande. O limite por anexo é de 20 MB.",
    )

  const ext = file.name.match(/\.([A-Za-z0-9]{1,12})$/)?.[1]?.toLowerCase()
  const path = `${profileId}/${patientId}/${attachmentId}${ext ? `.${ext}` : ""}`

  const { error } = await supabase.storage
    .from(PATIENT_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    })

  if (error)
    throw new Error(`[ATTACHMENTS] Falha no upload: ${error.message}`)

  return path
}

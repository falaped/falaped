import type { SupabaseClient } from "@supabase/supabase-js"
import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants"

// Allowlist explícito: PNG/JPEG/WebP. SVG é EXCLUÍDO do allowlist (vetor de XSS — T-02-04).
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * Faz upload da foto do paciente no bucket privado e retorna o PATH do objeto
 * (nunca a URL — D-02). Rejeita tipos não permitidos (incl. SVG) e arquivos
 * acima de 2 MB. Usa `upsert` para manter uma única foto substituível (D-08).
 * O prefixo `profileId/` no path É o escopo da RLS de storage (D-03).
 */
export async function uploadPatientPhoto(
  supabase: SupabaseClient,
  profileId: string,
  patientId: string,
  file: File | Blob,
): Promise<string> {
  const blob = file instanceof File ? file : new File([file], "photo")

  if (!ALLOWED_TYPES.includes(blob.type))
    throw new Error(
      "[PATIENTS] Tipo de arquivo não permitido. Use PNG, JPEG ou WebP.",
    )
  if (blob.size > MAX_SIZE_BYTES)
    throw new Error(
      "[PATIENTS] Arquivo muito grande. Envie uma imagem de até 2 MB.",
    )

  const ext = blob.name?.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase() ?? "jpg"
  const path = `${profileId}/${patientId}.${ext}`

  const { error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type })

  if (error)
    throw new Error(`[PATIENTS] Falha no upload da foto: ${error.message}`)

  return path
}

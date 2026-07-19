import type { SupabaseClient } from "@supabase/supabase-js"
import { GUIDANCE_BUCKET } from "@/lib/constants"

/**
 * Remove um documento de orientação por id, escopado ao profile dono (IDOR fix: D-15).
 * Usa o client user-scoped em todo o fluxo — sem admin client.
 * A linha do DB é removida primeiro; a remoção do PDF no storage é best-effort (órfão logado, não lançado).
 */
export async function deleteGuidanceDocument(
  supabase: SupabaseClient, // user-scoped client; storage RLS handles bucket access
  guidanceDocumentId: string,
  profileId: string, // ownership anchor for IDOR fix
  pdfStoragePath: string | null,
): Promise<void> {
  // 1. Remove a linha do DB primeiro — escopada por ownership (IDOR fix)
  const { error } = await supabase
    .from("guidance_documents")
    .delete()
    .eq("id", guidanceDocumentId)
    .eq("profile_id", profileId) // ownership filter — D-15, NEVER id-only

  if (error) {
    throw new Error(`[GUIDANCE] Failed to delete document: ${error.message}`)
  }

  // 2. Remove o PDF do storage (user client; storage RLS "Guidance documents delete own" aplica)
  if (pdfStoragePath?.trim()) {
    const { error: storageError } = await supabase.storage
      .from(GUIDANCE_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      // Loga mas NÃO lança — a linha do DB já foi removida; PDF órfão é preferível a IDOR
      console.error(
        `[GUIDANCE] Orphan PDF not removed: ${storageError.message}`,
      )
    }
  }
}

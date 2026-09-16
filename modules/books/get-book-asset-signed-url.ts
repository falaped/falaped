import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"

const SIGNED_URL_EXPIRY_SECONDS = 60

/**
 * Signed URL curta (60 s) para uma imagem ou PDF do livro no bucket privado.
 * Chamador já verificou que o livro pertence ao usuário. `null` se falhar.
 */
export async function getBookAssetSignedUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage.from(BOOK_ASSETS_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

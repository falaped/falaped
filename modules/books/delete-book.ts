import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"

/**
 * Apaga o livro do usuário (páginas caem em cascata) e depois todos os
 * arquivos em book-assets/{bookId}/. Erro de storage não rejeita: a linha já
 * se foi, e um arquivo órfão é preferível a um livro de outro dono acessível.
 */
export async function deleteBook(supabase: SupabaseClient, profileId: string, bookId: string): Promise<void> {
  const { error } = await supabase.from("books").delete().eq("id", bookId).eq("profile_id", profileId)
  if (error) throw new Error(`[BOOKS] Falha ao excluir livro: ${error.message}`)

  const storage = supabase.storage.from(BOOK_ASSETS_BUCKET)
  const paths: string[] = []
  for (const folder of ["", "photos", "pages"]) {
    const prefix = folder ? `${bookId}/${folder}` : bookId
    const { data } = await storage.list(prefix, { limit: 100 })
    for (const f of data ?? []) if (f.id) paths.push(`${prefix}/${f.name}`)
  }
  if (paths.length) {
    const { error: storageError } = await storage.remove(paths)
    if (storageError) console.error(`[BOOKS] Falha ao apagar arquivos do livro ${bookId}: ${storageError.message}`)
  }
}

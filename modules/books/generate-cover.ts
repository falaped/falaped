import type { SupabaseClient } from "@supabase/supabase-js"

import { COVER_INDEX } from "@/modules/books/constants"
import { generateAndStorePage } from "@/modules/books/generate-and-store-page"
import type { Book, BookPage } from "@/modules/books/types"

/**
 * Gera (ou refaz) a capa. O livro fica em `cover_ready` para o usuário
 * aprovar antes de gastar as outras 19 páginas; em falha, volta a `draft`.
 */
export async function generateCover(supabase: SupabaseClient, book: Book, replicateToken: string): Promise<BookPage> {
  try {
    const page = await generateAndStorePage(supabase, book, COVER_INDEX, replicateToken)
    await supabase.from("books").update({ status: "cover_ready", updated_at: new Date().toISOString() }).eq("id", book.id)
    return page
  } catch (err) {
    await supabase.from("books").update({ status: "draft", updated_at: new Date().toISOString() }).eq("id", book.id)
    throw err
  }
}

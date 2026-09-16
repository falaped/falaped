import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_PAGE_COUNT, COVER_INDEX } from "@/modules/books/constants"
import { generateAndStorePage } from "@/modules/books/generate-and-store-page"
import type { Book, BookPage } from "@/modules/books/types"

/**
 * Refaz uma página a pedido do usuário (a imagem anterior é sobrescrita).
 * Refazer a capa volta o livro para `cover_ready`: as demais páginas
 * continuam válidas, mas o usuário pode querer refazê-las com a nova âncora.
 * Qualquer página refeita invalida o PDF (pdf_path = null).
 */
export async function regeneratePage(
  supabase: SupabaseClient,
  book: Book,
  index: number,
  replicateToken: string,
): Promise<BookPage> {
  if (!Number.isInteger(index) || index < 0 || index >= BOOK_PAGE_COUNT)
    throw new Error(`[BOOKS] Índice de página inválido: ${index}`)
  const page = await generateAndStorePage(supabase, book, index, replicateToken)
  const patch: Record<string, unknown> = { pdf_path: null, updated_at: new Date().toISOString() }
  if (index === COVER_INDEX && book.status !== "ready") patch.status = "cover_ready"
  await supabase.from("books").update(patch).eq("id", book.id)
  return page
}

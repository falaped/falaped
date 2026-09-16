import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_PAGE_SELECT, BOOK_SELECT, type Book, type BookPage, type BookWithPages } from "@/modules/books/types"

/**
 * Livro do usuário com suas páginas ordenadas por índice. `null` se não
 * existir ou não pertencer ao profile (mesma resposta: evita enumeração).
 */
export async function getBook(
  supabase: SupabaseClient,
  profileId: string,
  bookId: string,
): Promise<BookWithPages | null> {
  const { data: book, error } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("id", bookId)
    .eq("profile_id", profileId)
    .maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar livro: ${error.message}`)
  if (!book) return null

  const { data: pages, error: pagesError } = await supabase
    .from("book_pages")
    .select(BOOK_PAGE_SELECT)
    .eq("book_id", bookId)
    .order("index", { ascending: true })
  if (pagesError) throw new Error(`[BOOKS] Falha ao buscar páginas: ${pagesError.message}`)

  return { ...(book as Book), pages: (pages ?? []) as BookPage[] }
}

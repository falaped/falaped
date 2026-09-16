import type { SupabaseClient } from "@supabase/supabase-js"

import { COVER_INDEX } from "@/modules/books/constants"
import { BOOK_SELECT, type Book } from "@/modules/books/types"

export type BookListItem = Book & {
  /** Capa pronta: a lista mostra a miniatura. */
  hasCover: boolean
  readyCount: number
}

/** Livros do usuário, mais recentes primeiro, com contagem de páginas prontas. */
export async function listBooks(supabase: SupabaseClient, profileId: string): Promise<BookListItem[]> {
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(`[BOOKS] Falha ao listar livros: ${error.message}`)
  const books = (data ?? []) as Book[]
  if (!books.length) return []

  const { data: pages, error: pagesError } = await supabase
    .from("book_pages")
    .select("book_id, index")
    .eq("status", "ready")
    .in("book_id", books.map((b) => b.id))
  if (pagesError) throw new Error(`[BOOKS] Falha ao contar páginas: ${pagesError.message}`)

  return books.map((b) => {
    const mine = (pages ?? []).filter((p) => p.book_id === b.id)
    return { ...b, hasCover: mine.some((p) => p.index === COVER_INDEX), readyCount: mine.length }
  })
}

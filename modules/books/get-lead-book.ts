import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"
import { bookPagePath, COVER_INDEX } from "@/modules/books/constants"
import { BOOK_LEAD_SELECT, BOOK_PAGE_SELECT, BOOK_SELECT, type Book, type BookLead, type BookPage, type BookWithPages } from "@/modules/books/types"

const COVER_URL_SECONDS = 60 * 60

export type LeadBookContext = {
  lead: BookLead
  /** Null enquanto o lead não criou o livro. */
  book: BookWithPages | null
  /** Signed URL da capa pronta (1 h). Null se ainda não existe. */
  coverUrl: string | null
}

/**
 * Lead da landing (pelo id do cookie) com seu único livro e a URL da capa.
 * `null` se o id não existir. Caller usa service role: tabelas sem policies.
 */
export async function getLeadBook(supabase: SupabaseClient, leadId: string): Promise<LeadBookContext | null> {
  const { data: lead, error } = await supabase.from("book_leads").select(BOOK_LEAD_SELECT).eq("id", leadId).maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar lead: ${error.message}`)
  if (!lead) return null

  const { data: book, error: bookError } = await supabase.from("books").select(BOOK_SELECT).eq("lead_id", leadId).maybeSingle()
  if (bookError) throw new Error(`[BOOKS] Falha ao buscar livro do lead: ${bookError.message}`)
  if (!book) return { lead: lead as BookLead, book: null, coverUrl: null }

  const { data: pages, error: pagesError } = await supabase
    .from("book_pages")
    .select(BOOK_PAGE_SELECT)
    .eq("book_id", book.id)
    .order("index", { ascending: true })
  if (pagesError) throw new Error(`[BOOKS] Falha ao buscar páginas: ${pagesError.message}`)

  const cover = (pages ?? []).find((p) => p.index === COVER_INDEX) as BookPage | undefined
  let coverUrl: string | null = null
  if (cover?.status === "ready") {
    const { data } = await supabase.storage.from(BOOK_ASSETS_BUCKET).createSignedUrl(bookPagePath(book.id, COVER_INDEX), COVER_URL_SECONDS)
    coverUrl = data?.signedUrl ?? null
  }
  return { lead: lead as BookLead, book: { ...(book as Book), pages: (pages ?? []) as BookPage[] }, coverUrl }
}

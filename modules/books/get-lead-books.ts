import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"
import { bookPagePath, COVER_INDEX } from "@/modules/books/constants"
import { BOOK_LEAD_SELECT, BOOK_PAGE_SELECT, BOOK_SELECT, type Book, type BookLead, type BookPage, type BookWithPages } from "@/modules/books/types"

const COVER_URL_SECONDS = 60 * 60

export type LeadBook = {
  book: BookWithPages
  /** Signed URL da capa pronta (1 h). Null enquanto ela não existe. */
  coverUrl: string | null
}

export type LeadBooksContext = {
  lead: BookLead
  /** Livros do lead, do mais antigo para o mais novo (até MAX_LEAD_COVERS). */
  books: LeadBook[]
}

/**
 * Lead da landing (pelo id do cookie) com seus livros e as URLs das capas.
 * `null` se o id não existir. Caller usa service role: tabelas sem policies.
 */
export async function getLeadBooks(supabase: SupabaseClient, leadId: string): Promise<LeadBooksContext | null> {
  const { data: lead, error } = await supabase.from("book_leads").select(BOOK_LEAD_SELECT).eq("id", leadId).maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar lead: ${error.message}`)
  if (!lead) return null

  const { data: books, error: booksError } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
  if (booksError) throw new Error(`[BOOKS] Falha ao buscar livros do lead: ${booksError.message}`)
  const rows = (books ?? []) as Book[]
  if (!rows.length) return { lead: lead as BookLead, books: [] }

  const { data: pages, error: pagesError } = await supabase
    .from("book_pages")
    .select(BOOK_PAGE_SELECT)
    .in("book_id", rows.map((b) => b.id))
    .order("index", { ascending: true })
  if (pagesError) throw new Error(`[BOOKS] Falha ao buscar páginas: ${pagesError.message}`)

  const ready = rows.filter((b) =>
    (pages ?? []).some((p) => p.book_id === b.id && p.index === COVER_INDEX && p.status === "ready"),
  )
  const { data: signed } = ready.length
    ? await supabase.storage.from(BOOK_ASSETS_BUCKET).createSignedUrls(ready.map((b) => bookPagePath(b.id, COVER_INDEX)), COVER_URL_SECONDS)
    : { data: [] }
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))

  return {
    lead: lead as BookLead,
    books: rows.map((book) => ({
      book: { ...book, pages: ((pages ?? []) as BookPage[]).filter((p) => p.book_id === book.id) },
      coverUrl: urlByPath.get(bookPagePath(book.id, COVER_INDEX)) ?? null,
    })),
  }
}

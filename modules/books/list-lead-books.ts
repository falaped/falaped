import type { SupabaseClient } from "@supabase/supabase-js"

import { BOOK_ASSETS_BUCKET } from "@/lib/constants"
import { bookPagePath, COVER_INDEX } from "@/modules/books/constants"
import { BOOK_LEAD_SELECT, BOOK_SELECT, type Book, type BookLead } from "@/modules/books/types"

export type LeadBookOrder = { book: Book; lead: BookLead; coverUrl: string | null }

/**
 * Pedidos da landing pública: livros criados por lead, mais recentes primeiro,
 * com o contato e a capa (signed URL de 1 h). Inclui os já assumidos (profile_id
 * preenchido) para o histórico. Só para o admin; caller faz o gate.
 */
export async function listLeadBooks(supabase: SupabaseClient): Promise<LeadBookOrder[]> {
  const { data, error } = await supabase
    .from("books")
    .select(`${BOOK_SELECT}, lead:book_leads!books_lead_id_fkey(${BOOK_LEAD_SELECT})`)
    .not("lead_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) throw new Error(`[BOOKS] Falha ao listar pedidos: ${error.message}`)
  const rows = (data ?? []) as unknown as (Book & { lead: BookLead | null })[]
  if (!rows.length) return []

  const { data: covers } = await supabase
    .from("book_pages")
    .select("book_id")
    .eq("index", COVER_INDEX)
    .eq("status", "ready")
    .in("book_id", rows.map((r) => r.id))
  const withCover = new Set((covers ?? []).map((c) => c.book_id as string))
  const paths = rows.filter((r) => withCover.has(r.id)).map((r) => bookPagePath(r.id, COVER_INDEX))
  const { data: signed } = paths.length ? await supabase.storage.from(BOOK_ASSETS_BUCKET).createSignedUrls(paths, 60 * 60) : { data: [] }
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))

  return rows.flatMap(({ lead, ...book }) =>
    lead ? [{ book, lead, coverUrl: urlByPath.get(bookPagePath(book.id, COVER_INDEX)) ?? null }] : [],
  )
}

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Admin assume o livro de um lead após confirmar o Pix: o livro passa a ter
 * profile_id e aparece na lista normal para gerar as páginas e o PDF; o lead
 * fica `paid` e `paid_at` é carimbado, o que faz a tela do comprador sair de
 * "aguardando" sozinha. Idempotente se já foi assumido pelo mesmo perfil.
 */
export async function claimLeadBook(supabase: SupabaseClient, bookId: string, profileId: string): Promise<void> {
  const { data: book, error } = await supabase.from("books").select("id, lead_id, profile_id, paid_at").eq("id", bookId).maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar livro: ${error.message}`)
  if (!book?.lead_id) throw new Error("[BOOKS] Este livro não veio da landing.")
  if (book.profile_id && book.profile_id !== profileId) throw new Error("[BOOKS] Livro já assumido por outro perfil.")

  const now = new Date().toISOString()
  const { error: bookError } = await supabase
    .from("books")
    .update({ profile_id: profileId, paid_at: (book as { paid_at?: string | null }).paid_at ?? now, updated_at: now })
    .eq("id", bookId)
  if (bookError) throw new Error(`[BOOKS] Falha ao assumir livro: ${bookError.message}`)
  const { error: leadError } = await supabase.from("book_leads").update({ status: "paid", updated_at: now }).eq("id", book.lead_id)
  if (leadError) throw new Error(`[BOOKS] Falha ao marcar lead como pago: ${leadError.message}`)
}

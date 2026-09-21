import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Marca o livro como pago e o lead como `paid`. Idempotente: webhook da Asaas
 * é "pelo menos uma vez", então o mesmo pagamento chega repetido. Quem produz
 * o livro continua sendo o gestor na tela de pedidos — aqui só cai a
 * conferência manual do extrato.
 */
export async function markBookPaid(supabase: SupabaseClient, bookId: string): Promise<{ alreadyPaid: boolean }> {
  const { data, error } = await supabase.from("books").select("id, lead_id, paid_at").eq("id", bookId).maybeSingle()
  if (error) throw new Error(`[BOOKS] Falha ao buscar o livro: ${error.message}`)
  if (!data) throw new Error("[BOOKS] Livro não encontrado.")
  if (data.paid_at) return { alreadyPaid: true }

  const now = new Date().toISOString()
  const { error: bookError } = await supabase.from("books").update({ paid_at: now, updated_at: now }).eq("id", bookId)
  if (bookError) throw new Error(`[BOOKS] Falha ao marcar o livro como pago: ${bookError.message}`)
  if (data.lead_id) {
    const { error: leadError } = await supabase.from("book_leads").update({ status: "paid", updated_at: now }).eq("id", data.lead_id)
    if (leadError) throw new Error(`[BOOKS] Falha ao marcar o lead como pago: ${leadError.message}`)
  }
  return { alreadyPaid: false }
}

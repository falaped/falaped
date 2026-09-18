"use server"

import { getBookLeadId } from "@/lib/book-lead-cookie"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getLeadBook } from "@/modules/books/get-lead-book"

export type CheckoutLeadBookResult = { ok: true } | { ok: false; error: string }

/**
 * O lead aprovou a capa e quer o livro completo: marca `checkout` para o
 * follow-up. O pagamento em si acontece no WhatsApp (Pix), fora do app.
 */
export async function checkoutLeadBookAction(): Promise<CheckoutLeadBookResult> {
  const leadId = await getBookLeadId()
  if (!leadId) return { ok: false, error: "Cadastro não encontrado." }
  const admin = createAdminClient()
  try {
    const ctx = await getLeadBook(admin, leadId)
    if (!ctx?.coverUrl) return { ok: false, error: "Gere a capa antes de pedir o livro." }
    if (ctx.lead.status === "paid") return { ok: true }
    const { error } = await admin
      .from("book_leads")
      .update({ status: "checkout", updated_at: new Date().toISOString() })
      .eq("id", leadId)
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao registrar o pedido." }
  }
}

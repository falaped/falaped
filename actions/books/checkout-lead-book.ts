"use server"

import { getBookLeadId } from "@/lib/book-lead-cookie"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { ensureBookPix, type BookPix } from "@/modules/books/ensure-book-pix"
import { getLeadBooks } from "@/modules/books/get-lead-books"

export type CheckoutLeadBookResult = { ok: true; paid: boolean; pix: BookPix | null } | { ok: false; error: string }

/**
 * O lead escolheu uma das capas e quer o livro completo: marca `checkout` para
 * o follow-up e devolve o Pix (QR + copia e cola) para pagar na própria tela.
 * Quem confirma o pagamento é o webhook da Asaas, nunca esta chamada.
 */
export async function checkoutLeadBookAction(bookId: string): Promise<CheckoutLeadBookResult> {
  const leadId = await getBookLeadId()
  if (!leadId) return { ok: false, error: "Cadastro não encontrado." }
  const admin = createAdminClient()
  try {
    const ctx = await getLeadBooks(admin, leadId)
    const chosen = ctx?.books.find((b) => b.book.id === bookId)
    if (!chosen?.coverUrl) return { ok: false, error: "Gere a capa antes de pedir o livro." }
    if (chosen.book.paid_at) return { ok: true, paid: true, pix: null }

    if (ctx!.lead.status !== "paid") {
      const { error } = await admin
        .from("book_leads")
        .update({ status: "checkout", updated_at: new Date().toISOString() })
        .eq("id", leadId)
      if (error) throw new Error(error.message)
    }
    const pix = await ensureBookPix(admin, bookId)
    return { ok: true, paid: false, pix }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message.replace(/^\[(BOOKS|PAYMENTS)\] /, "") : "Erro ao gerar o Pix."
    return { ok: false, error: message }
  }
}

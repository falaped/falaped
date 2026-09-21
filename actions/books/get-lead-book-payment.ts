"use server"

import { getBookLeadId } from "@/lib/book-lead-cookie"
import { createAdminClient } from "@/lib/supabase/server-admin"

export type LeadBookPaymentResult = { ok: true; paid: boolean } | { ok: false; error: string }

/**
 * A tela de pagamento pergunta de tempos em tempos se o Pix já caiu. Lê só o
 * que o webhook escreveu — o cliente nunca declara que pagou. Serve também de
 * rede quando o webhook falha: a fonte é sempre o banco.
 */
export async function getLeadBookPaymentAction(bookId: string): Promise<LeadBookPaymentResult> {
  const leadId = await getBookLeadId()
  if (!leadId) return { ok: false, error: "Cadastro não encontrado." }
  const { data, error } = await createAdminClient()
    .from("books")
    .select("paid_at")
    .eq("id", bookId)
    .eq("lead_id", leadId)
    .maybeSingle()
  if (error) return { ok: false, error: "Não foi possível conferir o pagamento." }
  if (!data) return { ok: false, error: "Livro não encontrado." }
  return { ok: true, paid: !!data.paid_at }
}

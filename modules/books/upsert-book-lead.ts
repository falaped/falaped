import type { SupabaseClient } from "@supabase/supabase-js"

import type { BookLeadInput } from "@/lib/schemas/book"
import { BOOK_LEAD_SELECT, type BookLead } from "@/modules/books/types"

const MAX_LEADS_PER_IP_24H = 5

/**
 * Cria o lead da landing ou atualiza o existente com o mesmo e-mail (nome e
 * WhatsApp mais recentes; `consent_at` renovado). Devolve o lead e o livro já
 * criado por ele, se houver, para o wizard pular direto para a capa.
 */
export async function upsertBookLead(
  supabase: SupabaseClient,
  input: BookLeadInput,
  ip: string | null,
): Promise<{ lead: BookLead; bookId: string | null }> {
  const { data: existing, error: findError } = await supabase
    .from("book_leads")
    .select("id")
    .eq("email", input.email)
    .maybeSingle()
  if (findError) throw new Error(`[BOOKS] Falha ao buscar lead: ${findError.message}`)

  if (!existing && ip) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from("book_leads")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since)
    if (error) throw new Error(`[BOOKS] Falha ao checar limite: ${error.message}`)
    if ((count ?? 0) >= MAX_LEADS_PER_IP_24H) throw new Error("[BOOKS] Muitos cadastros hoje a partir desta rede. Tente amanhã.")
  }

  const row = {
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    whatsapp: input.whatsapp,
    coupon: input.coupon,
    consent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(existing ? {} : { ip }),
  }
  const { data: lead, error } = await supabase
    .from("book_leads")
    .upsert({ ...(existing ? { id: existing.id } : {}), ...row }, { onConflict: "email" })
    .select(BOOK_LEAD_SELECT)
    .single()
  if (error || !lead) throw new Error(`[BOOKS] Falha ao salvar lead: ${error?.message}`)

  const { data: book, error: bookError } = await supabase.from("books").select("id").eq("lead_id", lead.id).maybeSingle()
  if (bookError) throw new Error(`[BOOKS] Falha ao buscar livro do lead: ${bookError.message}`)
  return { lead: lead as BookLead, bookId: book?.id ?? null }
}

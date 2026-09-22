import type { SupabaseClient } from "@supabase/supabase-js"

export type LeadOrigin = "site" | "books" | "whatsapp"

export type LeadRow = {
  id: string
  origin: LeadOrigin
  name: string | null
  email: string | null
  phone: string | null
  /** Coluna livre por origem: campanha do site, situação do book, último contato no WhatsApp. */
  detail: string | null
  created_at: string
}

/**
 * Leads das três origens em uma lista só, da mais recente para a mais antiga.
 *
 * `lp_leads` é a landing do Falaped, `book_leads` a dos livros e `leads` os telefones que
 * escreveram no WhatsApp sem conta. Exige service role — nenhuma delas é escopada por perfil.
 */
export async function listLeads(supabase: SupabaseClient): Promise<LeadRow[]> {
  const [site, books, whatsapp] = await Promise.all([
    supabase.from("lp_leads").select("id, name, email, whatsapp, source, created_at"),
    supabase
      .from("book_leads")
      .select("id, first_name, last_name, email, whatsapp, status, coupon, created_at"),
    supabase.from("leads").select("id, phone, first_seen_at, last_seen_at"),
  ])

  for (const { error } of [site, books, whatsapp])
    if (error) throw new Error(`[ADMIN] Failed to list leads: ${error.message}`)

  const rows: LeadRow[] = [
    ...(site.data ?? []).map((lead) => ({
      id: lead.id,
      origin: "site" as const,
      name: lead.name,
      email: lead.email,
      phone: lead.whatsapp,
      detail: lead.source,
      created_at: lead.created_at ?? new Date(0).toISOString(),
    })),
    ...(books.data ?? []).map((lead) => ({
      id: lead.id,
      origin: "books" as const,
      name: [lead.first_name, lead.last_name].filter(Boolean).join(" "),
      email: lead.email,
      phone: lead.whatsapp,
      detail: [lead.status, lead.coupon].filter(Boolean).join(" · "),
      created_at: lead.created_at,
    })),
    ...(whatsapp.data ?? []).map((lead) => ({
      id: lead.id,
      origin: "whatsapp" as const,
      name: null,
      email: null,
      phone: lead.phone,
      detail: `visto por último em ${new Date(lead.last_seen_at).toLocaleString("pt-BR")}`,
      created_at: lead.first_seen_at,
    })),
  ]

  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

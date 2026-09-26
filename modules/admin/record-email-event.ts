import type { SupabaseClient } from "@supabase/supabase-js"

import type { EmailStatus } from "@/modules/admin/list-prospects"

/**
 * Evento da Resend → status do convite. O que não está aqui (delivery_delayed, received…)
 * é ignorado. opened/clicked só chegam com o tracking ligado no domínio, no painel da Resend.
 */
const EVENT_STATUS: Record<string, EmailStatus> = {
  "email.delivered": "entregue",
  "email.opened": "aberto",
  "email.clicked": "clicou",
  "email.bounced": "bounce",
  "email.complained": "reclamou",
}

/** Ordem de gravidade: um evento só avança o status, nunca volta (webhooks chegam fora de ordem). */
const RANK: Record<EmailStatus, number> = { enviado: 0, entregue: 1, aberto: 2, clicou: 3, bounce: 4, reclamou: 5 }

/**
 * Registra no prospect o evento de entrega do convite. Devolve o status gravado ou null
 * quando o evento não interessa ou o e-mail não é de um convite conhecido.
 */
export async function recordEmailEvent(
  supabase: SupabaseClient,
  event: { type: string; emailId: string },
): Promise<EmailStatus | null> {
  const next = EVENT_STATUS[event.type]
  if (!next) return null

  const { data, error } = await supabase
    .from("prospects")
    .select("id, email_status")
    .eq("resend_email_id", event.emailId)
    .maybeSingle()
  if (error) throw new Error(`[ADMIN] Falha ao buscar o convite do evento: ${error.message}`)
  if (!data) return null

  const current = data.email_status as EmailStatus | null
  if (current && RANK[current] >= RANK[next]) return current

  const { error: updateError } = await supabase
    .from("prospects")
    .update({ email_status: next, updated_at: new Date().toISOString() })
    .eq("id", data.id)
  if (updateError) throw new Error(`[ADMIN] Falha ao registrar o evento do convite: ${updateError.message}`)
  return next
}

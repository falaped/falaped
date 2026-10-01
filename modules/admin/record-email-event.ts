import type { SupabaseClient } from "@supabase/supabase-js"

import type { EmailStatus } from "@/modules/admin/list-prospects"

/**
 * Evento da Resend → status do e-mail. O que não está aqui (delivery_delayed, received…)
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
const advances = (current: EmailStatus | null, next: EmailStatus) => !current || RANK[next] > RANK[current]

/**
 * Registra o evento no envio (taxa do modelo) e no prospect (status do e-mail, datas de
 * abertura/clique para a temperatura, linha do tempo). Devolve o status gravado ou null
 * quando o evento não interessa ou o e-mail não é conhecido.
 */
export async function recordEmailEvent(
  supabase: SupabaseClient,
  event: { type: string; emailId: string },
): Promise<EmailStatus | null> {
  const next = EVENT_STATUS[event.type]
  if (!next) return null
  const now = new Date().toISOString()

  const { data: send, error: sendError } = await supabase
    .from("message_sends")
    .select("id, status, prospect_id")
    .eq("resend_email_id", event.emailId)
    .maybeSingle()
  if (sendError) throw new Error(`[ADMIN] Falha ao buscar o envio do evento: ${sendError.message}`)
  const sendAdvanced = !!send && advances(send.status as EmailStatus, next)
  if (sendAdvanced) {
    const { error } = await supabase.from("message_sends").update({ status: next }).eq("id", send.id)
    if (error) throw new Error(`[ADMIN] Falha ao registrar o evento do envio: ${error.message}`)
  }

  // Convites antigos só têm o id no prospect; os novos têm nos dois.
  const lookup = supabase.from("prospects").select("id, email_status, resend_email_id")
  const { data: prospect, error } = await (send?.prospect_id
    ? lookup.eq("id", send.prospect_id)
    : lookup.eq("resend_email_id", event.emailId)
  ).maybeSingle()
  if (error) throw new Error(`[ADMIN] Falha ao buscar o prospect do evento: ${error.message}`)
  if (!prospect) return send ? next : null

  // O status do prospect segue só o último e-mail; datas e linha do tempo valem para qualquer um.
  const current = prospect.email_status as EmailStatus | null
  const prospectAdvanced = prospect.resend_email_id === event.emailId && advances(current, next)
  const patch = {
    ...(prospectAdvanced && { email_status: next }),
    ...((next === "aberto" || next === "clicou") && { opened_at: now }),
    ...(next === "clicou" && { clicked_at: now }),
  }
  if (Object.keys(patch).length > 0) {
    const { error: updateError } = await supabase.from("prospects").update({ ...patch, updated_at: now }).eq("id", prospect.id)
    if (updateError) throw new Error(`[ADMIN] Falha ao registrar o evento do e-mail: ${updateError.message}`)
  }
  // Abertura repetida não vira outra linha: só entra quando o status avançou.
  if (next !== "entregue" && (send ? sendAdvanced : prospectAdvanced)) {
    const { error: eventError } = await supabase.from("prospect_events").insert({ prospect_id: prospect.id, kind: next, created_at: now })
    if (eventError) throw new Error(`[ADMIN] Falha ao registrar o evento na linha do tempo: ${eventError.message}`)
  }
  return next
}

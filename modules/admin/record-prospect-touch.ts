import type { SupabaseClient } from "@supabase/supabase-js"

import type { MessageMoment } from "@/lib/message-template"
import { FOLLOW_UP_DAYS, type ContactChannel, type ProspectRow } from "@/modules/admin/list-prospects"

export type TouchSend = {
  templateId: string | null
  moment: MessageMoment
  subject: string | null
  body: string
  resendEmailId?: string | null
}

/** O que o "Desfazer" precisa para voltar o prospect a como estava antes do toque. */
export type TouchUndo = {
  prospectId: string
  eventId: number
  sendId: string | null
  previous: Pick<ProspectRow, "status" | "last_channel" | "last_contact_at" | "next_contact_at">
}

/**
 * Registra um toque (e-mail, WhatsApp ou ligação): evento na linha do tempo, envio no
 * histórico do modelo (quando houve mensagem), último contato, próximo contato pela
 * cadência do canal e novo → contatado.
 */
export async function recordProspectTouch(
  supabase: SupabaseClient,
  id: string,
  input: { channel: ContactChannel; detail: string | null; send?: TouchSend },
): Promise<TouchUndo> {
  const { data: current, error } = await supabase
    .from("prospects")
    .select("status, last_channel, last_contact_at, next_contact_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(`[ADMIN] Falha ao buscar o prospect: ${error.message}`)
  if (!current) throw new Error("[ADMIN] Prospect não encontrado.")

  let sendId: string | null = null
  if (input.send) {
    const { data: send, error: sendError } = await supabase
      .from("message_sends")
      .insert({
        template_id: input.send.templateId,
        prospect_id: id,
        channel: input.channel === "telefone" ? "whatsapp" : input.channel,
        moment: input.send.moment,
        subject: input.send.subject,
        body: input.send.body,
        resend_email_id: input.send.resendEmailId ?? null,
      })
      .select("id")
      .single()
    if (sendError) throw new Error(`[ADMIN] Falha ao registrar o envio: ${sendError.message}`)
    sendId = send.id
  }

  const { data: event, error: eventError } = await supabase
    .from("prospect_events")
    .insert({ prospect_id: id, kind: input.channel, detail: input.detail })
    .select("id")
    .single()
  if (eventError) throw new Error(`[ADMIN] Falha ao registrar o toque: ${eventError.message}`)

  const now = new Date()
  const { error: updateError } = await supabase
    .from("prospects")
    .update({
      status: current.status === "novo" ? "contatado" : current.status,
      last_channel: input.channel,
      last_contact_at: now.toISOString(),
      next_contact_at: new Date(now.getTime() + FOLLOW_UP_DAYS[input.channel] * 86_400_000).toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", id)
  if (updateError) throw new Error(`[ADMIN] Falha ao registrar o toque: ${updateError.message}`)

  return { prospectId: id, eventId: event.id, sendId, previous: current as TouchUndo["previous"] }
}

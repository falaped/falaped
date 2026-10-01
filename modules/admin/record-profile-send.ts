import type { SupabaseClient } from "@supabase/supabase-js"

import type { MessageChannel, MessageMoment } from "@/lib/message-template"

/** Mensagem para uma conta (cliente): entra no histórico do modelo. Devolve o id do envio. */
export async function recordProfileSend(
  supabase: SupabaseClient,
  input: {
    profileId: string
    channel: MessageChannel
    templateId: string | null
    moment: MessageMoment
    subject: string | null
    body: string
    resendEmailId?: string | null
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("message_sends")
    .insert({
      profile_id: input.profileId,
      channel: input.channel,
      template_id: input.templateId,
      moment: input.moment,
      subject: input.subject,
      body: input.body,
      resend_email_id: input.resendEmailId ?? null,
    })
    .select("id")
    .single()
  if (error) throw new Error(`[ADMIN] Falha ao registrar o envio: ${error.message}`)
  return data.id
}

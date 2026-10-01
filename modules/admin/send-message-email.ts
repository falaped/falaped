import type { SupabaseClient } from "@supabase/supabase-js"

import { ADMIN_SENDER } from "@/lib/admin-sender"
import { env } from "@/lib/env"
import type { MessageMoment } from "@/lib/message-template"
import { buildBrandEmail } from "@/modules/admin/emails/brand-email"
import { recordProfileSend } from "@/modules/admin/record-profile-send"
import { recordProspectTouch } from "@/modules/admin/record-prospect-touch"
import { BOOKS_EMAIL_REPLY_TO } from "@/modules/books/constants"

const RESEND_ENDPOINT = "https://api.resend.com/emails"
/** Caixa que recebe as respostas — o domínio de envio (contato.falaped.com.br) não tem entrada. */
const REPLY_TO = BOOKS_EMAIL_REPLY_TO

export type EmailRecipient = { prospectId: string } | { profileId: string }

/**
 * Envia pela Resend o e-mail que o admin revisou (assunto e texto já preenchidos), no
 * layout da marca, e registra: envio no histórico do modelo, toque no prospect (convite
 * conta em `invite_count`) ou envio na conta. O id da Resend liga os eventos do webhook.
 */
export async function sendMessageEmail(
  supabase: SupabaseClient,
  input: { to: EmailRecipient; templateId: string | null; templateName: string | null; moment: MessageMoment; subject: string; body: string },
): Promise<void> {
  if (!env.RESEND_API_KEY) throw new Error("[ADMIN] RESEND_API_KEY ausente: e-mail não enviado.")

  const isProspect = "prospectId" in input.to
  const { data: person, error } = isProspect
    ? await supabase.from("prospects").select("email, invite_count").eq("id", (input.to as { prospectId: string }).prospectId).maybeSingle()
    : await supabase.from("profiles").select("email").eq("id", (input.to as { profileId: string }).profileId).maybeSingle()
  if (error) throw new Error(`[ADMIN] Falha ao buscar o destinatário: ${error.message}`)
  if (!person?.email) throw new Error("[ADMIN] Sem e-mail: preencha o contato antes de enviar.")

  const { html, text } = buildBrandEmail({ body: input.body, senderName: ADMIN_SENDER })
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.INVITE_EMAIL_FROM,
      to: [person.email],
      reply_to: REPLY_TO,
      subject: input.subject,
      html,
      text,
      headers: { "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=${encodeURIComponent("Não quero receber")}>` },
      tags: [{ name: "moment", value: input.moment }],
    }),
  })
  if (!res.ok) throw new Error(`[ADMIN] Resend recusou o e-mail (${res.status}): ${(await res.text()).slice(0, 200)}`)
  const resendEmailId = ((await res.json().catch(() => null)) as { id?: string } | null)?.id ?? null

  const send = { templateId: input.templateId, moment: input.moment, subject: input.subject, body: input.body, resendEmailId }
  if (!isProspect) {
    await recordProfileSend(supabase, { profileId: (input.to as { profileId: string }).profileId, channel: "email", ...send })
    return
  }

  const prospectId = (input.to as { prospectId: string }).prospectId
  await recordProspectTouch(supabase, prospectId, { channel: "email", detail: input.templateName ?? input.subject, send })
  const { error: updateError } = await supabase
    .from("prospects")
    .update({
      resend_email_id: resendEmailId,
      email_status: "enviado",
      ...(input.moment === "convite" && {
        invited_at: new Date().toISOString(),
        invite_count: ((person as { invite_count?: number }).invite_count ?? 0) + 1,
      }),
    })
    .eq("id", prospectId)
  if (updateError) throw new Error(`[ADMIN] E-mail enviado, mas falhou ao registrar: ${updateError.message}`)
}

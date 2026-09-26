import type { SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"
import { buildInviteEmail } from "@/modules/admin/emails/invite-email"
import { attachProfiles, FOLLOW_UP_DAYS, type ProspectRow } from "@/modules/admin/list-prospects"
import { BOOKS_EMAIL_REPLY_TO } from "@/modules/books/constants"

const RESEND_ENDPOINT = "https://api.resend.com/emails"
/** Caixa que recebe as respostas — o domínio de envio (contato.falaped.com.br) não tem entrada. */
const INVITE_REPLY_TO = BOOKS_EMAIL_REPLY_TO

/** "Filipe, do Falaped <x@y>" → "Filipe". */
const senderFirstName = (from: string) => from.split("<")[0].trim().split(/[\s,]+/)[0] || "Falaped"

/**
 * Envia o convite (15 dias grátis) para o e-mail do prospect, registra
 * `invited_at` / `invite_count`, guarda o id da Resend (para o webhook de entrega),
 * marca o toque por e-mail com o próximo contato em 3 dias e move `novo` → `contatado`.
 * Reenviar é permitido: o contador mostra quantas vezes já foi.
 */
export async function sendProspectInvite(supabase: SupabaseClient, id: string): Promise<ProspectRow> {
  if (!env.RESEND_API_KEY) throw new Error("[ADMIN] RESEND_API_KEY ausente: convite não enviado.")

  const { data, error } = await supabase.from("prospects").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(`[ADMIN] Falha ao buscar o prospect: ${error.message}`)
  const row = data as ProspectRow | null
  if (!row) throw new Error("[ADMIN] Prospect não encontrado.")
  if (!row.email) throw new Error("[ADMIN] Prospect sem e-mail: preencha antes de convidar.")

  const { subject, html, text } = buildInviteEmail({
    title: row.title,
    name: row.name,
    city: row.city,
    kind: row.kind,
    senderName: senderFirstName(env.INVITE_EMAIL_FROM),
    replyTo: INVITE_REPLY_TO,
  })

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.INVITE_EMAIL_FROM,
      to: [row.email],
      reply_to: INVITE_REPLY_TO,
      subject,
      html,
      text,
      headers: { "List-Unsubscribe": `<mailto:${INVITE_REPLY_TO}?subject=${encodeURIComponent("Não quero receber")}>` },
      tags: [{ name: "campaign", value: "prospeccao-mg" }],
    }),
  })
  if (!res.ok) throw new Error(`[ADMIN] Resend recusou o convite (${res.status}): ${(await res.text()).slice(0, 200)}`)
  const sent = (await res.json().catch(() => null)) as { id?: string } | null

  const now = new Date()
  const { data: updated, error: updateError } = await supabase
    .from("prospects")
    .update({
      invited_at: now.toISOString(),
      invite_count: row.invite_count + 1,
      status: row.status === "novo" ? "contatado" : row.status,
      resend_email_id: sent?.id ?? null,
      email_status: "enviado",
      last_channel: "email",
      last_contact_at: now.toISOString(),
      next_contact_at: new Date(now.getTime() + FOLLOW_UP_DAYS.email * 86_400_000).toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single()
  if (updateError) throw new Error(`[ADMIN] Convite enviado, mas falhou ao registrar: ${updateError.message}`)
  const [full] = await attachProfiles(supabase, [updated as Omit<ProspectRow, "profile">])
  return full!
}

import type { SupabaseClient } from "@supabase/supabase-js"

import type { MessageChannel, MessageMoment } from "@/lib/message-template"

export type TemplateStats = { sent: number; opened: number; clicked: number; replied: number }
export type MessageTemplate = {
  id: string
  moment: MessageMoment
  channel: MessageChannel
  name: string
  subject: string | null
  body: string
  updated_at: string
  stats: TemplateStats
}

const OPENED = new Set(["aberto", "clicou"])

/**
 * Modelos ativos com a taxa de cada um: enviados, abertos e clicados (e-mail, pelo webhook)
 * e quantos prospects responderam depois do envio (marcado à mão, vale para os dois canais).
 */
export async function listMessageTemplates(supabase: SupabaseClient): Promise<MessageTemplate[]> {
  const [{ data: templates, error }, { data: sends, error: sendsError }] = await Promise.all([
    supabase.from("message_templates").select("id, moment, channel, name, subject, body, updated_at").eq("archived", false).order("created_at"),
    supabase.from("message_sends").select("template_id, status, prospect_id, created_at").not("template_id", "is", null),
  ])
  if (error) throw new Error(`[ADMIN] Falha ao listar os modelos: ${error.message}`)
  if (sendsError) throw new Error(`[ADMIN] Falha ao listar os envios: ${sendsError.message}`)

  const prospectIds = [...new Set((sends ?? []).map((s) => s.prospect_id).filter(Boolean))]
  const replied = new Map<string, string>()
  if (prospectIds.length > 0) {
    const { data, error: repliedError } = await supabase
      .from("prospects")
      .select("id, replied_at")
      .in("id", prospectIds)
      .not("replied_at", "is", null)
    if (repliedError) throw new Error(`[ADMIN] Falha ao ler respostas: ${repliedError.message}`)
    for (const p of data ?? []) replied.set(p.id, p.replied_at)
  }

  const stats = new Map<string, TemplateStats>()
  for (const s of sends ?? []) {
    const t = stats.get(s.template_id) ?? { sent: 0, opened: 0, clicked: 0, replied: 0 }
    t.sent += 1
    if (OPENED.has(s.status)) t.opened += 1
    if (s.status === "clicou") t.clicked += 1
    const at = s.prospect_id ? replied.get(s.prospect_id) : undefined
    if (at && at >= s.created_at) t.replied += 1
    stats.set(s.template_id, t)
  }

  return (templates ?? []).map((t) => ({
    ...(t as Omit<MessageTemplate, "stats">),
    stats: stats.get(t.id) ?? { sent: 0, opened: 0, clicked: 0, replied: 0 },
  }))
}

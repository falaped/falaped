import type { SupabaseClient } from "@supabase/supabase-js"

import type { MessageChannel, MessageMoment } from "@/lib/message-template"

export type MessageTemplateInput = {
  moment: MessageMoment
  channel: MessageChannel
  name: string
  subject: string | null
  body: string
  archived?: boolean
}

/** Cria (sem id) ou atualiza um modelo. Arquivar esconde da lista e mantém o histórico de envios. */
export async function saveMessageTemplate(
  supabase: SupabaseClient,
  id: string | null,
  input: MessageTemplateInput,
): Promise<string> {
  const row = { ...input, subject: input.channel === "email" ? input.subject : null, updated_at: new Date().toISOString() }
  const query = id
    ? supabase.from("message_templates").update(row).eq("id", id).select("id").maybeSingle()
    : supabase.from("message_templates").insert(row).select("id").single()
  const { data, error } = await query
  if (error) throw new Error(`[ADMIN] Falha ao salvar o modelo: ${error.message}`)
  if (!data) throw new Error("[ADMIN] Modelo não encontrado.")
  return data.id
}

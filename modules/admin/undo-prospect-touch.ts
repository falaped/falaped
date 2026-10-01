import type { SupabaseClient } from "@supabase/supabase-js"

import type { TouchUndo } from "@/modules/admin/record-prospect-touch"

/** Desfaz um toque de WhatsApp/ligação: apaga o evento e o envio e devolve os campos anteriores. */
export async function undoProspectTouch(supabase: SupabaseClient, undo: TouchUndo): Promise<void> {
  const { error } = await supabase.from("prospect_events").delete().eq("id", undo.eventId).eq("prospect_id", undo.prospectId)
  if (error) throw new Error(`[ADMIN] Falha ao desfazer o toque: ${error.message}`)
  if (undo.sendId) {
    const { error: sendError } = await supabase.from("message_sends").delete().eq("id", undo.sendId)
    if (sendError) throw new Error(`[ADMIN] Falha ao desfazer o envio: ${sendError.message}`)
  }
  const { error: updateError } = await supabase
    .from("prospects")
    .update({ ...undo.previous, updated_at: new Date().toISOString() })
    .eq("id", undo.prospectId)
  if (updateError) throw new Error(`[ADMIN] Falha ao desfazer o toque: ${updateError.message}`)
}

import type { SupabaseClient } from "@supabase/supabase-js"

/** Nota livre na linha do tempo do prospect (o que conversaram, objeções, próximos passos). */
export async function addProspectNote(supabase: SupabaseClient, id: string, text: string): Promise<void> {
  const { error } = await supabase.from("prospect_events").insert({ prospect_id: id, kind: "nota", detail: text })
  if (error) throw new Error(`[ADMIN] Falha ao salvar a nota: ${error.message}`)
}

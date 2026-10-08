import type { SupabaseClient } from "@supabase/supabase-js"

import type { FeedbackStatus } from "@/lib/feedback"

/** Muda o status de um feedback (Novo, Em análise, Feito). Exige service role. */
export async function updateFeedbackStatus(supabase: SupabaseClient, id: string, status: FeedbackStatus): Promise<void> {
  const { error } = await supabase.from("feedback").update({ status }).eq("id", id)
  if (error) throw new Error(`[ADMIN] Falha ao mudar o status do feedback: ${error.message}`)
}

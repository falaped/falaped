import type { SupabaseClient } from "@supabase/supabase-js"

/** Feedbacks ainda com status "novo": o selo da aba Feedback e do item Admin. */
export async function countNewFeedback(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase.from("feedback").select("id", { count: "exact", head: true }).eq("status", "novo")
  if (error) throw new Error(`[ADMIN] Falha ao contar feedback novo: ${error.message}`)
  return count ?? 0
}

import type { SupabaseClient } from "@supabase/supabase-js"

import { HOT_DAYS } from "@/lib/funnel"

/** Leads da landing dos últimos 14 dias ainda sem contato e sem conta: o aviso do admin. */
export async function countNewLeads(supabase: SupabaseClient): Promise<number> {
  const since = new Date(Date.now() - HOT_DAYS * 86_400_000).toISOString()
  const { count, error } = await supabase
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("status", "novo")
    .is("profile_id", null)
    .gte("lead_at", since)
  if (error) throw new Error(`[ADMIN] Falha ao contar leads novos: ${error.message}`)
  return count ?? 0
}

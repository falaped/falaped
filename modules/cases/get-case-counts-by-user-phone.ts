import type { SupabaseClient } from "@supabase/supabase-js"

export type CaseCounts = {
  active: number
  closed: number
  all: number
}

/**
 * Returns the count of cases per status for the current user.
 */
export async function getCaseCountsByUserPhone(
  supabase: SupabaseClient,
  userPhone: string,
): Promise<CaseCounts> {
  const { count: activeCount, error: activeError } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("user_phone", userPhone)
    .eq("status", "active")

  if (activeError) throw new Error(`[CASES] Failed to count active cases: ${activeError.message}`)

  const { count: closedCount, error: closedError } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("user_phone", userPhone)
    .eq("status", "closed")

  if (closedError) throw new Error(`[CASES] Failed to count closed cases: ${closedError.message}`)

  const active = activeCount ?? 0
  const closed = closedCount ?? 0

  return {
    active,
    closed,
    all: active + closed,
  }
}

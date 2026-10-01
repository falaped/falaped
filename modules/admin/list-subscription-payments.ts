import type { SupabaseClient } from "@supabase/supabase-js"

export type SubscriptionPayment = {
  id: string
  amount_cents: number
  paid_at: string
  valid_until: string
  note: string | null
  created_at: string
}

/** Pagamentos lançados de uma conta, do período mais novo para o mais antigo. Exige service role. */
export async function listSubscriptionPayments(
  supabase: SupabaseClient,
  profileId: string,
): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("id, amount_cents, paid_at, valid_until, note, created_at")
    .eq("profile_id", profileId)
    .order("valid_until", { ascending: false })
  if (error) throw new Error(`[ADMIN] Failed to list payments: ${error.message}`)
  return data ?? []
}

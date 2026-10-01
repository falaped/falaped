import type { SupabaseClient } from "@supabase/supabase-js"

export type NewSubscriptionPayment = {
  profile_id: string
  amount_cents: number
  paid_at: string
  valid_until: string
  note: string | null
}

/**
 * Lança um pagamento e deixa a conta como `paid`: quem pagou não depende mais do trial.
 * Exige service role.
 */
export async function addSubscriptionPayment(
  supabase: SupabaseClient,
  payment: NewSubscriptionPayment,
): Promise<void> {
  const { error } = await supabase.from("subscription_payments").insert(payment)
  if (error) throw new Error(`[ADMIN] Failed to add payment: ${error.message}`)

  const { error: statusError } = await supabase
    .from("authenticated_users")
    .update({ status: "paid" })
    .eq("profile_id", payment.profile_id)
  if (statusError) throw new Error(`[ADMIN] Failed to mark account as paid: ${statusError.message}`)
}

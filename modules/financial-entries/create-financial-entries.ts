import type { SupabaseClient } from "@supabase/supabase-js"

import type { PaymentMethodInput } from "@/lib/schemas/financial-entry"

/** Uma linha pronta para inserção: centavos inteiros e data já em ISO. */
export type NewFinancialEntryRow = {
  case_id: string | null
  description: string
  amount_cents: number
  payment_method: PaymentMethodInput
  received_on: string
}

/**
 * Insere lançamentos do livro-caixa escopados ao perfil do médico (EARN-02).
 *
 * As linhas chegam JÁ em centavos inteiros e com a data em ISO — o módulo não parseia
 * reais nem data (isso é boundary de action, como a conversão de unidade em
 * `actions/patient-growth/create-measurement.ts`).
 *
 * Um único `insert` é uma transação implícita, então um conjunto parcial nunca pode ser
 * observado — nenhum RPC é necessário. O `profile_id` é estampado a partir do argumento
 * (que vem do gate), nunca do payload do cliente.
 */
export async function createFinancialEntries(
  supabase: SupabaseClient,
  profileId: string,
  rows: NewFinancialEntryRow[],
): Promise<string[]> {
  const payload = rows.map((row) => ({
    profile_id: profileId,
    case_id: row.case_id,
    description: row.description,
    amount_cents: row.amount_cents,
    payment_method: row.payment_method,
    received_on: row.received_on,
  }))

  const { data, error } = await supabase
    .from("financial_entries")
    .insert(payload)
    .select("id")

  if (error) {
    throw new Error(`[EARNINGS] Failed to create entries: ${error.message}`)
  }

  return (data ?? []).map((row) => (row as { id: string }).id)
}

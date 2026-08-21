import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Desfaz a anulação de um lançamento (EARN-05) — o outro lado de
 * `voidFinancialEntry`, e o motivo pelo qual o "Desfazer" do toast pode existir:
 * anular é um UPDATE, não uma exclusão, então há o que restaurar.
 *
 * Mesmo duplo filtro (id + perfil): restaurar o lançamento de outro médico seria
 * exatamente o mesmo IDOR da anulação, e escopar somente pelo id é igualmente proibido.
 *
 * Restaurar um lançamento que não está anulado é no-op: zera uma coluna já nula.
 * Como no anular, só a coluna de anulação é escrita — nenhum valor é tocado.
 */
export async function restoreFinancialEntry(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("financial_entries")
    .update({ voided_at: null })
    .eq("id", id)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[EARNINGS] Failed to restore entry: ${error.message}`)
  }
}

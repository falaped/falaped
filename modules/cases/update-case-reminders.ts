import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Grava os lembretes/pendências de um caso. Escopado por `user_phone`, que é
 * como `cases` amarra a posse (não há `profile_id` na tabela) — id de caso
 * alheio não atualiza nada.
 *
 * Texto vazio vira `null`: "sem lembrete" e "string vazia" não podem ser dois
 * estados diferentes na hora de montar o resumo.
 */
export async function updateCaseReminders(
  supabase: SupabaseClient,
  caseId: string,
  userPhone: string,
  reminders: string | null,
): Promise<void> {
  const value = reminders?.trim() ? reminders.trim() : null

  const { error } = await supabase
    .from("cases")
    .update({ reminders: value })
    .eq("id", caseId)
    .eq("user_phone", userPhone)

  if (error)
    throw new Error(`[CASES] Failed to update reminders: ${error.message}`)
}

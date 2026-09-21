import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Grava o mini resumo do atendimento e carimba a data da geração.
 *
 * `summary_generated_at` é carimbado mesmo com resumo `null`: significa
 * "tentou e não saiu", que é diferente de "nunca tentou". Sem essa distinção,
 * todo caso fechado antes da feature ficaria parecendo geração pendente.
 */
export async function updateCaseSummary(
  supabase: SupabaseClient,
  caseId: string,
  userPhone: string,
  summary: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("cases")
    .update({
      summary: summary?.trim() ? summary.trim() : null,
      summary_generated_at: new Date().toISOString(),
    })
    .eq("id", caseId)
    .eq("user_phone", userPhone)

  if (error)
    throw new Error(`[CASES] Failed to update summary: ${error.message}`)
}

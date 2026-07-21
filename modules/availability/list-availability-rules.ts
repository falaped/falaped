import type { SupabaseClient } from "@supabase/supabase-js"
import type { AvailabilityRuleRow } from "./types"

/**
 * Lista as faixas de disponibilidade semanal do médico, escopadas por
 * profile_id — o backstop de ownership / defesa contra IDOR (D-13): NUNCA ler
 * sem o filtro de profile_id. Ordena por weekday e start_minute para exibição
 * estável na grade.
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 */
export async function listAvailabilityRules(
  supabase: SupabaseClient,
  profileId: string,
): Promise<AvailabilityRuleRow[]> {
  const { data, error } = await supabase
    .from("availability_rules")
    .select(
      "id, profile_id, weekday, start_minute, end_minute, slot_minutes, created_at",
    )
    .eq("profile_id", profileId)
    .order("weekday", { ascending: true })
    .order("start_minute", { ascending: true })

  if (error)
    throw new Error(
      `[AVAILABILITY] Failed to list availability rules: ${error.message}`,
    )

  return (data ?? []) as AvailabilityRuleRow[]
}

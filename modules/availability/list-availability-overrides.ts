import type { SupabaseClient } from "@supabase/supabase-js"
import type { AvailabilityOverrideRow } from "./types"

/**
 * Lista os overrides de disponibilidade do médico (modelo híbrido v2, D-20),
 * escopados por profile_id — o backstop de ownership / defesa contra IDOR
 * (D-13): NUNCA ler sem o filtro de profile_id. Inclui `override_type` e
 * `slot_minutes` no select para que a expansão híbrida (aditivos + subtrativos)
 * receba os dados corretos. Ordena por exception_date para exibição estável.
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 */
export async function listAvailabilityOverrides(
  supabase: SupabaseClient,
  profileId: string,
): Promise<AvailabilityOverrideRow[]> {
  const { data, error } = await supabase
    .from("availability_exceptions")
    .select(
      "id, profile_id, exception_date, start_minute, end_minute, override_type, slot_minutes, created_at",
    )
    .eq("profile_id", profileId)
    .order("exception_date", { ascending: true })

  if (error)
    throw new Error(
      `[AVAILABILITY] Failed to list availability overrides: ${error.message}`,
    )

  return (data ?? []) as AvailabilityOverrideRow[]
}

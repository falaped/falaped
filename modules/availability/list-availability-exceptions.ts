import type { SupabaseClient } from "@supabase/supabase-js"
import type { AvailabilityExceptionRow } from "./types"

/**
 * Lista as exceções de disponibilidade do médico, escopadas por profile_id — o
 * backstop de ownership / defesa contra IDOR (D-13): NUNCA ler sem o filtro de
 * profile_id. Ordena por exception_date para exibição estável.
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 */
export async function listAvailabilityExceptions(
  supabase: SupabaseClient,
  profileId: string,
): Promise<AvailabilityExceptionRow[]> {
  const { data, error } = await supabase
    .from("availability_exceptions")
    .select("id, profile_id, exception_date, start_minute, end_minute, created_at")
    .eq("profile_id", profileId)
    .order("exception_date", { ascending: true })

  if (error)
    throw new Error(
      `[AVAILABILITY] Failed to list availability exceptions: ${error.message}`,
    )

  return (data ?? []) as AvailabilityExceptionRow[]
}

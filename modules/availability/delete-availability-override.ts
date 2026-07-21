import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Remove um override de disponibilidade (modelo híbrido v2, D-20), escopado por
 * AMBOS profile_id e id — o backstop de ownership contra IDOR (D-13): NUNCA
 * deletar por id sozinho, o que permitiria um médico apagar o override de outro.
 * Idempotente: deletar um override inexistente (ou de outro dono) é no-op (nunca
 * erro). A tabela permanece `availability_exceptions`.
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 * @param id Id do override a remover.
 */
export async function deleteAvailabilityOverride(
  supabase: SupabaseClient,
  profileId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("availability_exceptions")
    .delete()
    .eq("profile_id", profileId)
    .eq("id", id)

  if (error)
    throw new Error(
      `[AVAILABILITY] Failed to delete availability override: ${error.message}`,
    )
}

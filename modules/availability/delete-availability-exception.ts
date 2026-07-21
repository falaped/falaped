import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Remove uma exceção de disponibilidade, escopada por AMBOS profile_id e id — o
 * backstop de ownership contra IDOR (D-13): NUNCA deletar por id sozinho, o que
 * permitiria um médico apagar a exceção de outro. Idempotente: deletar uma
 * exceção inexistente é no-op (nunca erro).
 *
 * @param supabase Cliente por-requisição injetado.
 * @param profileId Id do perfil do médico dono.
 * @param id Id da exceção a remover.
 */
export async function deleteAvailabilityException(
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
      `[AVAILABILITY] Failed to delete availability exception: ${error.message}`,
    )
}

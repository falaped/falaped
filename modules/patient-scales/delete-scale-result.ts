import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Apaga uma aplicação de escala do perfil informado. O filtro por profile_id é o
 * backstop de posse: id de outro médico não apaga nada.
 */
export async function deleteScaleResult(
  supabase: SupabaseClient,
  profileId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("patient_scale_results")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)

  if (error)
    throw new Error(`[SCALES] Failed to delete scale result: ${error.message}`)
}

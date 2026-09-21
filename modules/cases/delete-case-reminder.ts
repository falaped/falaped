import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Apaga um lembrete. O filtro por `profile_id` é o backstop de posse: id de
 * outro médico não apaga nada.
 */
export async function deleteCaseReminder(
  supabase: SupabaseClient,
  profileId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("case_reminders")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)

  if (error)
    throw new Error(`[CASES] Failed to delete reminder: ${error.message}`)
}

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Deletes a prescription template by id. Does not check profile ownership.
 * Caller must ensure the template belongs to the current user.
 */
export async function deletePrescriptionTemplate(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("prescription_templates")
    .delete()
    .eq("id", id)

  if (error) {
    throw new Error(
      `[PRESCRIPTION_TEMPLATES] delete failed: ${error.message}`,
    )
  }
}

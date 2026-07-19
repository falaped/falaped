import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Deletes an exam panel by id, scoped to the owning profile (IDOR fix: D-15).
 * NEVER id-only — the ownership filter prevents cross-tenant deletion.
 */
export async function deleteExamPanel(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("exam_panels")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId) // ownership filter — D-15, NEVER id-only

  if (error) {
    throw new Error(`[EXAM_PANELS] delete failed: ${error.message}`)
  }
}

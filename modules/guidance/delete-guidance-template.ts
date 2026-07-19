import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Remove um item da biblioteca de orientações, escopado por profile_id (IDOR fix: D-15).
 */
export async function deleteGuidanceTemplate(
  supabase: SupabaseClient,
  id: string,
  profileId: string, // ownership anchor — D-15, NEVER id-only
): Promise<void> {
  const { error } = await supabase
    .from("guidance_templates")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId) // ownership filter — D-15

  if (error) {
    throw new Error(`[GUIDANCE] delete template failed: ${error.message}`)
  }
}

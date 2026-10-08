import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Renames an exam panel, scoped to the owning profile (never id-only).
 * Throws when no row matched, so a foreign id is reported instead of silently ignored.
 */
export async function renameExamPanel(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
  name: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("exam_panels")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id")

  if (error) throw new Error(`[EXAM_PANELS] rename failed: ${error.message}`)
  if (!data?.length) throw new Error("[EXAM_PANELS] panel not found")
}

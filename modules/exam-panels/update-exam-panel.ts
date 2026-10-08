import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Updates an exam panel's name and items, scoped to the owning profile (never id-only).
 * Throws when no row matched, so a foreign id is reported instead of silently ignored.
 */
export async function updateExamPanel(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
  params: { name: string; panelItems: string[] },
): Promise<void> {
  const { data, error } = await supabase
    .from("exam_panels")
    .update({ name: params.name.trim(), panel_items: params.panelItems })
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id")

  if (error) throw new Error(`[EXAM_PANELS] update failed: ${error.message}`)
  if (!data?.length) throw new Error("[EXAM_PANELS] panel not found")
}

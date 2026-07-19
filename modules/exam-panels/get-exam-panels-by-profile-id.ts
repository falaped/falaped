import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExamPanel } from "./types"

/**
 * Returns reusable exam panels for a profile (D-02), ordered by name.
 * panel_items expand into the editable wizard array (D-03). Scoped by profile_id.
 */
export async function getExamPanelsByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ExamPanel[]> {
  const { data, error } = await supabase
    .from("exam_panels")
    .select("id, name, panel_items")
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`[EXAM_PANELS] Failed to list panels: ${error.message}`)
  }

  return (data ?? []) as ExamPanel[]
}

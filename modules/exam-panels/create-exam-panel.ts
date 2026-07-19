import type { SupabaseClient } from "@supabase/supabase-js"

export type CreateExamPanelParams = {
  profileId: string
  name: string
  panelItems: string[]
}

/**
 * Creates a reusable exam panel for a profile and returns its id (D-02).
 * panel_items stores RESOLVED exam name strings.
 */
export async function createExamPanel(
  supabase: SupabaseClient,
  params: CreateExamPanelParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("exam_panels")
    .insert({
      profile_id: params.profileId,
      name: params.name.trim(),
      panel_items: params.panelItems,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`[EXAM_PANELS] create failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[EXAM_PANELS] create returned no id")
  }

  return data.id as string
}

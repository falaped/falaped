import type { SupabaseClient } from "@supabase/supabase-js"
import type { GuidanceTemplate } from "./types"

/**
 * Retorna a biblioteca de orientações do profile, ordenada por sort_order e milestone.
 */
export async function getGuidanceTemplatesByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<GuidanceTemplate[]> {
  const { data, error } = await supabase
    .from("guidance_templates")
    .select("id, milestone, body, sort_order")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("milestone", { ascending: true })

  if (error) {
    throw new Error(`[GUIDANCE] Failed to list templates: ${error.message}`)
  }

  return (data ?? []) as GuidanceTemplate[]
}

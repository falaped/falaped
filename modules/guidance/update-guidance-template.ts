import type { SupabaseClient } from "@supabase/supabase-js"

export type UpdateGuidanceTemplateParams = {
  milestone?: string
  body?: string
  sortOrder?: number
}

/**
 * Atualiza um item da biblioteca de orientações, escopado por profile_id (IDOR fix: D-15).
 */
export async function updateGuidanceTemplate(
  supabase: SupabaseClient,
  id: string,
  profileId: string, // ownership anchor — D-15, NEVER id-only
  params: UpdateGuidanceTemplateParams,
): Promise<void> {
  const updates: Record<string, unknown> = {}
  if (params.milestone !== undefined) updates.milestone = params.milestone.trim()
  if (params.body !== undefined) updates.body = params.body.trim()
  if (params.sortOrder !== undefined) updates.sort_order = params.sortOrder

  if (Object.keys(updates).length === 0) return

  const { error } = await supabase
    .from("guidance_templates")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", profileId) // ownership filter — D-15

  if (error) {
    throw new Error(`[GUIDANCE] update template failed: ${error.message}`)
  }
}

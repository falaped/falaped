import type { SupabaseClient } from "@supabase/supabase-js"

export type CreateGuidanceTemplateParams = {
  profileId: string
  milestone: string
  body: string
  sortOrder?: number
}

/**
 * Cria um item da biblioteca de orientações e retorna o id.
 */
export async function createGuidanceTemplate(
  supabase: SupabaseClient,
  params: CreateGuidanceTemplateParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("guidance_templates")
    .insert({
      profile_id: params.profileId,
      milestone: params.milestone.trim(),
      body: params.body.trim(),
      sort_order: params.sortOrder ?? 0,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`[GUIDANCE] create template failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[GUIDANCE] create template returned no id")
  }

  return data.id as string
}

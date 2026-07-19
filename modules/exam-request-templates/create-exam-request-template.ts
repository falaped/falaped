import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExamRequestTemplateSnapshot } from "./types"

export type CreateExamRequestTemplateParams = {
  profileId: string
  name: string
  snapshot: ExamRequestTemplateSnapshot
}

/**
 * Creates an exam request template and returns its id.
 */
export async function createExamRequestTemplate(
  supabase: SupabaseClient,
  params: CreateExamRequestTemplateParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("exam_request_templates")
    .insert({
      profile_id: params.profileId,
      name: params.name.trim(),
      snapshot: params.snapshot as unknown as Record<string, unknown>,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(`[EXAM_REQUEST_TEMPLATES] create failed: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("[EXAM_REQUEST_TEMPLATES] create returned no id")
  }

  return data.id as string
}

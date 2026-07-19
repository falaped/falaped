import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExamRequestTemplateOption } from "./types"

export type { ExamRequestTemplateOption }

/**
 * Returns exam request templates for the given profile, ordered by name.
 */
export async function getExamRequestTemplatesByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ExamRequestTemplateOption[]> {
  const { data, error } = await supabase
    .from("exam_request_templates")
    .select("id, name, created_at, snapshot")
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(
      `[EXAM_REQUEST_TEMPLATES] Failed to list templates: ${error.message}`,
    )
  }

  return (data ?? []) as ExamRequestTemplateOption[]
}

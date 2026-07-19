import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExamRequestTemplate } from "./types"

/**
 * Returns an exam request template by id only if it belongs to the given profile.
 * Ownership gate: query scoped by both id and profile_id (D-15).
 */
export async function getExamRequestTemplateByIdForProfile(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<ExamRequestTemplate | null> {
  const { data, error } = await supabase
    .from("exam_request_templates")
    .select("id, profile_id, name, snapshot, created_at, updated_at")
    .eq("id", id)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `[EXAM_REQUEST_TEMPLATES] fetch by id failed: ${error.message}`,
    )
  }

  return (data as ExamRequestTemplate | null) ?? null
}

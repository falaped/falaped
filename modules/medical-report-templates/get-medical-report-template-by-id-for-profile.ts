import type { SupabaseClient } from "@supabase/supabase-js"
import type { MedicalReportTemplate } from "./types"

/**
 * Returns a medical report template by id only if it belongs to the given profile.
 * Ownership gate: query scoped by both id and profile_id (D-15).
 */
export async function getMedicalReportTemplateByIdForProfile(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<MedicalReportTemplate | null> {
  const { data, error } = await supabase
    .from("medical_report_templates")
    .select("id, profile_id, name, snapshot, created_at, updated_at")
    .eq("id", id)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `[MEDICAL_REPORT_TEMPLATES] fetch by id failed: ${error.message}`,
    )
  }

  return (data as MedicalReportTemplate | null) ?? null
}

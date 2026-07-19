import type { SupabaseClient } from "@supabase/supabase-js"
import type { MedicalReportTemplateOption } from "./types"

export type { MedicalReportTemplateOption }

/**
 * Returns medical report templates for the given profile, ordered by name.
 */
export async function getMedicalReportTemplatesByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<MedicalReportTemplateOption[]> {
  const { data, error } = await supabase
    .from("medical_report_templates")
    .select("id, name, created_at, snapshot")
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(
      `[MEDICAL_REPORT_TEMPLATES] Failed to list templates: ${error.message}`,
    )
  }

  return (data ?? []) as MedicalReportTemplateOption[]
}

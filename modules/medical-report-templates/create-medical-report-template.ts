import type { SupabaseClient } from "@supabase/supabase-js"
import type { MedicalReportTemplateSnapshot } from "./types"

export type CreateMedicalReportTemplateParams = {
  profileId: string
  name: string
  snapshot: MedicalReportTemplateSnapshot
}

/**
 * Creates a medical report template and returns its id.
 */
export async function createMedicalReportTemplate(
  supabase: SupabaseClient,
  params: CreateMedicalReportTemplateParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("medical_report_templates")
    .insert({
      profile_id: params.profileId,
      name: params.name.trim(),
      snapshot: params.snapshot as unknown as Record<string, unknown>,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(
      `[MEDICAL_REPORT_TEMPLATES] create failed: ${error.message}`,
    )
  }

  if (!data?.id) {
    throw new Error("[MEDICAL_REPORT_TEMPLATES] create returned no id")
  }

  return data.id as string
}

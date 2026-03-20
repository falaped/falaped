import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReportTemplateSection } from "./get-report-template-by-id"
import { getProfileAuthUserId } from "@/modules/profiles/get-profile-auth-user-id"
import { normalizeReportTemplateSections } from "./fixed-template-sections"

export type CreateReportTemplatePayload = {
  name: string
  sections: ReportTemplateSection[]
}

/**
 * Creates a report template for the given profile. Sets user_id from profile.auth_user_id.
 * Returns the new template id.
 */
export async function createReportTemplate(
  supabase: SupabaseClient,
  profileId: string,
  payload: CreateReportTemplatePayload
): Promise<string> {
  const authUserId = await getProfileAuthUserId(supabase, profileId)
  if (authUserId == null)
    throw new Error("[REPORT_TEMPLATES] Profile not found or has no auth_user_id")

  const sections = normalizeReportTemplateSections(payload.sections)

  const { data, error } = await supabase
    .from("report_templates")
    .insert({
      user_id: authUserId,
      name: payload.name,
      sections,
      is_default: false,
    })
    .select("id")
    .single()

  if (error)
    throw new Error(
      `[REPORT_TEMPLATES] Failed to create template: ${error.message}`
    )

  return data.id
}

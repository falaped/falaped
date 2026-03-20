import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReportTemplateSection } from "./get-report-template-by-id"
import { getProfileAuthUserId } from "@/modules/profiles/get-profile-auth-user-id"
import { normalizeReportTemplateSections } from "./fixed-template-sections"

export type UpdateReportTemplatePayload = {
  name?: string
  sections?: ReportTemplateSection[]
}

/**
 * Updates a report template. Only updates if the template belongs to the profile
 * (template.user_id = profile.auth_user_id). Returns true if updated, false if not found or not owned.
 */
export async function updateReportTemplate(
  supabase: SupabaseClient,
  templateId: string,
  profileId: string,
  payload: UpdateReportTemplatePayload
): Promise<boolean> {
  const authUserId = await getProfileAuthUserId(supabase, profileId)
  if (authUserId == null)
    throw new Error("[REPORT_TEMPLATES] Profile not found or has no auth_user_id")

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (payload.name !== undefined) updates.name = payload.name
  if (payload.sections !== undefined) {
    updates.sections = normalizeReportTemplateSections(payload.sections)
  }

  const { data, error } = await supabase
    .from("report_templates")
    .update(updates)
    .eq("id", templateId)
    .eq("user_id", authUserId)
    .select("id")
    .maybeSingle()

  if (error)
    throw new Error(
      `[REPORT_TEMPLATES] Failed to update template: ${error.message}`
    )

  return data != null
}

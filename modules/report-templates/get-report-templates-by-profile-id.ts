import type { SupabaseClient } from "@supabase/supabase-js"
import { getProfileAuthUserId } from "@/modules/profiles/get-profile-auth-user-id"

export type ReportTemplateSectionPreview = {
  name: string
  description?: string
}

export type ReportTemplateOption = {
  id: string
  name: string
  is_default: boolean
  created_at: string
  sections: ReportTemplateSectionPreview[]
}

/**
 * Returns report templates available for the profile: templates that belong to the user
 * (user_id = profile.auth_user_id) plus the project default template (is_default = true).
 * Used for profile report_template_id selection and for the templates CRUD list.
 */
export async function getReportTemplatesByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<ReportTemplateOption[]> {
  const authUserId = await getProfileAuthUserId(supabase, profileId)
  if (authUserId == null)
    throw new Error("[REPORT_TEMPLATES] Profile not found or has no auth_user_id")

  const { data, error } = await supabase
    .from("report_templates")
    .select("id, name, is_default, created_at, sections")
    .or(`user_id.eq.${authUserId},is_default.eq.true`)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (error)
    throw new Error(
      `[REPORT_TEMPLATES] Failed to list templates: ${error.message}`
    )

  return (data ?? []) as ReportTemplateOption[]
}

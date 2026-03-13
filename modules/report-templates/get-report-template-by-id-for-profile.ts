import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReportTemplateWithSections } from "./get-report-template-by-id"
import { getProfileAuthUserId } from "@/modules/profiles/get-profile-auth-user-id"

/**
 * Returns a report template by id only if it belongs to the profile (user_id = profile.auth_user_id).
 * Used for the edit template page; returns null if not found or not owned.
 */
export async function getReportTemplateByIdForProfile(
  supabase: SupabaseClient,
  templateId: string,
  profileId: string
): Promise<ReportTemplateWithSections | null> {
  const authUserId = await getProfileAuthUserId(supabase, profileId)
  if (authUserId == null) return null

  const { data, error } = await supabase
    .from("report_templates")
    .select("id, name, sections")
    .eq("id", templateId)
    .eq("user_id", authUserId)
    .maybeSingle()

  if (error)
    throw new Error(
      `[REPORT_TEMPLATES] Failed to fetch template: ${error.message}`
    )

  if (!data) return null
  return data as ReportTemplateWithSections
}

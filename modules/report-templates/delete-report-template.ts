import type { SupabaseClient } from "@supabase/supabase-js"
import { getProfileById } from "@/modules/profiles/get-profile-by-id"
import { updateProfile } from "@/modules/profiles/update-profile"

/**
 * Deletes a report template. Only deletes if the template belongs to the profile
 * and is not the project default (is_default = true). If the profile's report_template_id
 * points to this template, it is set to null before deletion.
 * Returns true if deleted, false if not found, not owned, or is default.
 */
export async function deleteReportTemplate(
  supabase: SupabaseClient,
  templateId: string,
  profileId: string
): Promise<boolean> {
  const profile = await getProfileById(supabase, profileId)
  if (!profile)
    throw new Error("[REPORT_TEMPLATES] Profile not found")

  const { data: template, error: fetchError } = await supabase
    .from("report_templates")
    .select("id, user_id, is_default")
    .eq("id", templateId)
    .maybeSingle()

  if (fetchError)
    throw new Error(
      `[REPORT_TEMPLATES] Failed to fetch template: ${fetchError.message}`
    )

  if (!template || template.user_id !== profile.auth_user_id)
    return false
  if (template.is_default === true)
    return false

  if (profile.report_template_id === templateId) {
    await updateProfile(supabase, profileId, { report_template_id: null })
  }

  const { error: deleteError } = await supabase
    .from("report_templates")
    .delete()
    .eq("id", templateId)

  if (deleteError)
    throw new Error(
      `[REPORT_TEMPLATES] Failed to delete template: ${deleteError.message}`
    )

  return true
}

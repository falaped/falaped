import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Deletes a medical report template by id, scoped to the owning profile (defense-in-depth, D-15).
 * NEVER id-only — the ownership filter prevents cross-tenant deletion.
 */
export async function deleteMedicalReportTemplate(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("medical_report_templates")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId) // ownership hardening — NEVER id-only

  if (error) {
    throw new Error(
      `[MEDICAL_REPORT_TEMPLATES] delete failed: ${error.message}`,
    )
  }
}

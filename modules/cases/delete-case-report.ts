import type { SupabaseClient } from "@supabase/supabase-js"
import { getCaseReportById } from "./get-case-report"

/**
 * Deletes a case report by id. Verifies ownership via getCaseReportById.
 */
export async function deleteCaseReport(
  supabase: SupabaseClient,
  reportId: string,
  profileId: string,
): Promise<void> {
  const existing = await getCaseReportById(supabase, reportId, profileId)
  if (!existing) {
    throw new Error("[CASES] Cannot delete case report: report not found or access denied")
  }

  const { error } = await supabase
    .from("case_reports")
    .delete()
    .eq("id", reportId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(
      `[CASES] Failed to delete case report: ${error.message}`,
    )
  }
}

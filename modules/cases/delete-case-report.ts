import type { SupabaseClient } from "@supabase/supabase-js"
import { getCaseById } from "./get-case-by-id"

/**
 * Deletes the case report for a case. Verifies ownership via getCaseById;
 * if the user does not own the case, throws.
 */
export async function deleteCaseReport(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<void> {
  const caseDetail = await getCaseById(supabase, caseId, profileId)
  if (!caseDetail) {
    throw new Error("[CASES] Cannot delete case report: user does not own the case")
  }

  const { error } = await supabase
    .from("case_reports")
    .delete()
    .eq("case_id", caseId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(
      `[CASES] Failed to delete case report: ${error.message}`,
    )
  }
}

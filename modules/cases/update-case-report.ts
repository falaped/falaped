import type { SupabaseClient } from "@supabase/supabase-js"
import type { CaseReportSection } from "./get-case-report"
import { getCaseById } from "./get-case-by-id"

export type UpdateCaseReportPayload = {
  case_id: string
  profile_id: string
  sections?: CaseReportSection[]
  is_finalized?: boolean
  finalized_at?: string | null
}

/**
 * Updates an existing case report. Only provided fields are updated.
 * Use for: reorder sections, finalize, or unfinalize.
 * Verifies ownership via getCaseById; if the user does not own the case, throws.
 */
export async function updateCaseReport(
  supabase: SupabaseClient,
  payload: UpdateCaseReportPayload,
): Promise<void> {
  const { case_id, profile_id, sections, is_finalized, finalized_at } = payload

  const caseDetail = await getCaseById(supabase, case_id, profile_id)
  if (!caseDetail) {
    throw new Error("[CASES] Cannot update case report: user does not own the case")
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (sections !== undefined) updatePayload.sections = sections
  if (is_finalized !== undefined) updatePayload.is_finalized = is_finalized
  if (finalized_at !== undefined) updatePayload.finalized_at = finalized_at

  const { error } = await supabase
    .from("case_reports")
    .update(updatePayload)
    .eq("case_id", case_id)

  if (error) {
    throw new Error(
      `[CASES] Failed to update case report: ${error.message}`,
    )
  }
}

import type { SupabaseClient } from "@supabase/supabase-js"
import type { CaseReportSection } from "./get-case-report"
import { getCaseReportById } from "./get-case-report"

export type UpdateCaseReportPayload = {
  report_id: string
  profile_id: string
  sections?: CaseReportSection[]
  is_finalized?: boolean
  finalized_at?: string | null
}

/**
 * Updates an existing case report by id. Only provided fields are updated.
 * Verifies ownership via getCaseReportById.
 */
export async function updateCaseReport(
  supabase: SupabaseClient,
  payload: UpdateCaseReportPayload,
): Promise<void> {
  const { report_id, profile_id, sections, is_finalized, finalized_at } = payload

  const existing = await getCaseReportById(supabase, report_id, profile_id)
  if (!existing) {
    throw new Error("[CASES] Cannot update case report: report not found or access denied")
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
    .eq("id", report_id)
    .eq("profile_id", profile_id)

  if (error) {
    throw new Error(
      `[CASES] Failed to update case report: ${error.message}`,
    )
  }
}

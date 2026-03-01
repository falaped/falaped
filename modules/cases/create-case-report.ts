import type { SupabaseClient } from "@supabase/supabase-js"
import type { CaseReportSection } from "./get-case-report"
import { getCaseById } from "./get-case-by-id"

export type CreateCaseReportPayload = {
  case_id: string
  profile_id: string
  report_template_id: string
  sections: CaseReportSection[]
}

/**
 * Creates a case report. Use when generating the report for the first time.
 * Verifies ownership via getCaseById; if the user does not own the case, throws.
 */
export async function createCaseReport(
  supabase: SupabaseClient,
  payload: CreateCaseReportPayload,
): Promise<void> {
  const { case_id, profile_id, report_template_id, sections } = payload

  const caseDetail = await getCaseById(supabase, case_id, profile_id)
  if (!caseDetail) {
    throw new Error("[CASES] Cannot create case report: user does not own the case")
  }

  const { error } = await supabase.from("case_reports").insert({
    case_id,
    profile_id,
    report_template_id,
    sections,
    is_finalized: false,
    finalized_at: null,
  })
  if (error) {
    throw new Error(
      `[CASES] Failed to create case report: ${error.message}`,
    )
  }
}

import type { SupabaseClient } from "@supabase/supabase-js"
import type { CaseReportSection } from "./get-case-report"
import { getCaseById } from "./get-case-by-id"

export type CreateCaseReportPayload = {
  case_id: string
  profile_id: string
  report_template_id: string
  sections: CaseReportSection[]
  source: string
}

/**
 * Creates a case report. Use when generating the report.
 * Verifies ownership via getCaseById; if the user does not own the case, throws.
 * Returns the new report id.
 */
export async function createCaseReport(
  supabase: SupabaseClient,
  payload: CreateCaseReportPayload,
): Promise<string> {
  const { case_id, profile_id, report_template_id, sections, source } = payload

  const caseDetail = await getCaseById(supabase, case_id, profile_id)
  if (!caseDetail) {
    throw new Error("[CASES] Cannot create case report: user does not own the case")
  }

  const { data, error } = await supabase
    .from("case_reports")
    .insert({
      case_id,
      profile_id,
      report_template_id,
      sections,
      source,
      is_finalized: true,
      finalized_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (error) {
    throw new Error(
      `[CASES] Failed to create case report: ${error.message}`,
    )
  }
  return data.id
}

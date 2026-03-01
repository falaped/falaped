import type { SupabaseClient } from "@supabase/supabase-js"
import { getCaseById } from "./get-case-by-id"

export type CaseReportSection = {
  name: string
  description?: string
  content: string
  order: number
}

export type CaseReport = {
  id: string
  case_id: string
  profile_id: string
  report_template_id: string
  sections: CaseReportSection[]
  is_finalized: boolean
  finalized_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Fetches the case report for a case. Uses getCaseById to verify ownership;
 * if the user does not own the case, returns null.
 */
export async function getCaseReport(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<CaseReport | null> {
  const caseDetail = await getCaseById(supabase, caseId, profileId)
  if (!caseDetail) return null

  const { data: reportRow, error: reportError } = await supabase
    .from("case_reports")
    .select(
      "id, case_id, profile_id, report_template_id, sections, is_finalized, finalized_at, created_at, updated_at",
    )
    .eq("case_id", caseId)
    .maybeSingle()

  if (reportError) {
    throw new Error(`[CASES] Failed to fetch case report: ${reportError.message}`)
  }
  if (!reportRow) return null

  return reportRow as CaseReport
}

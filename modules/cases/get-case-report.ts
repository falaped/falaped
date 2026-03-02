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
  source: string
  created_at: string
  updated_at: string
}

const CASE_REPORT_SELECT =
  "id, case_id, profile_id, report_template_id, sections, is_finalized, finalized_at, source, created_at, updated_at"

/**
 * Fetches all case reports for a case. Uses getCaseById to verify ownership;
 * returns empty array if user does not own the case.
 */
export async function getCaseReports(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<CaseReport[]> {
  const caseDetail = await getCaseById(supabase, caseId, profileId)
  if (!caseDetail) return []

  const { data: rows, error } = await supabase
    .from("case_reports")
    .select(CASE_REPORT_SELECT)
    .eq("case_id", caseId)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`[CASES] Failed to fetch case reports: ${error.message}`)
  }
  return (rows ?? []) as CaseReport[]
}

/**
 * Fetches a single case report by id. Verifies ownership via profile_id.
 */
export async function getCaseReportById(
  supabase: SupabaseClient,
  reportId: string,
  profileId: string,
): Promise<CaseReport | null> {
  const { data: row, error } = await supabase
    .from("case_reports")
    .select(CASE_REPORT_SELECT)
    .eq("id", reportId)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    throw new Error(`[CASES] Failed to fetch case report: ${error.message}`)
  }
  return (row ?? null) as CaseReport | null
}

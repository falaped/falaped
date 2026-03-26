import type { SupabaseClient } from "@supabase/supabase-js"

import type { AuthenticatedUserProfile } from "@/modules/supabase/get-authenticated-user"

import type { CaseOrigin } from "@/modules/cases/types"

export interface DashboardHomeActiveCasePatient {
  name: string | null
  birthDate: string | null
  responsible: string | null
  contactPhone: string | null
}

export interface DashboardHomeActiveCaseReport {
  isFinalized: boolean
  updatedAt: string
}

export interface DashboardHomeActiveCase {
  id: string
  startedAt: string
  origin: CaseOrigin
  pendingAction: string | null
  contextSummary: string | null
  patient: DashboardHomeActiveCasePatient | null
  messageCount: number
  lastMessageAt: string | null
  report: DashboardHomeActiveCaseReport | null
}

export interface DashboardHomeRecentClosedCase {
  id: string
  startedAt: string
  endedAt: string | null
  patientName: string | null
  responsible: string | null
}

export interface DashboardHomeData {
  closedCasesCount: number
  patientsCount: number
  totalCasesCount: number
  prescriptionsCount: number
  medicalCertificatesCount: number
  activeCase: DashboardHomeActiveCase | null
  recentClosedCases: DashboardHomeRecentClosedCase[]
}

type ActiveCaseRow = {
  id: string
  started_at: string
  origin: CaseOrigin
  pending_action: string | null
  dashboard_chat_context_summary: string | null
  patient:
    | {
        name: string
        birth_date: string | null
        responsible: string | null
        contact_phone: string | null
      }
    | {
        name: string
        birth_date: string | null
        responsible: string | null
        contact_phone: string | null
      }[]
    | null
}

type ClosedCaseRow = {
  id: string
  started_at: string
  ended_at: string | null
  patient:
    | { name: string; responsible: string | null }
    | { name: string; responsible: string | null }[]
    | null
}

function normalizeActivePatient(
  patient: ActiveCaseRow["patient"],
): DashboardHomeActiveCasePatient | null {
  if (patient == null) return null
  const row = Array.isArray(patient) ? patient[0] : patient
  if (!row) return null
  return {
    name: row.name ?? null,
    birthDate: row.birth_date ?? null,
    responsible: row.responsible ?? null,
    contactPhone: row.contact_phone ?? null,
  }
}

function normalizeClosedPatient(
  patient: ClosedCaseRow["patient"],
): { name: string | null; responsible: string | null } {
  if (patient == null) return { name: null, responsible: null }
  const row = Array.isArray(patient) ? patient[0] : patient
  return {
    name: row?.name ?? null,
    responsible: row?.responsible ?? null,
  }
}

/**
 * Loads dashboard home summary: single active case (when any), document counts,
 * recent closed cases, and optional report/message stats for the active case.
 */
export async function getDashboardHomeData(
  supabase: SupabaseClient,
  profile: AuthenticatedUserProfile,
): Promise<DashboardHomeData> {
  const profileId = profile.id

  const [
    closedResult,
    patientsResult,
    totalCasesResult,
    prescriptionsResult,
    certificatesResult,
    activeRowResult,
    closedRecentResult,
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("status", "closed"),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("prescriptions")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("medical_certificates")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("cases")
      .select(
        `
      id,
      started_at,
      origin,
      pending_action,
      dashboard_chat_context_summary,
      patient:patients(
        name,
        birth_date,
        responsible,
        contact_phone
      )
    `,
      )
      .eq("profile_id", profileId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cases")
      .select(
        `
      id,
      started_at,
      ended_at,
      patient:patients(
        name,
        responsible
      )
    `,
      )
      .eq("profile_id", profileId)
      .eq("status", "closed")
      .order("ended_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ])

  const checks = [
    { label: "closed cases count", result: closedResult },
    { label: "patients count", result: patientsResult },
    { label: "total cases count", result: totalCasesResult },
    { label: "prescriptions count", result: prescriptionsResult },
    { label: "medical certificates count", result: certificatesResult },
    { label: "active case row", result: activeRowResult },
    { label: "recent closed cases", result: closedRecentResult },
  ] as const

  for (const { label, result } of checks) {
    if (result.error) {
      throw new Error(
        `[DASHBOARD_HOME] Failed to load ${label}: ${result.error.message}`,
      )
    }
  }

  const activeRow = activeRowResult.data as ActiveCaseRow | null

  let activeCase: DashboardHomeActiveCase | null = null
  if (activeRow) {
    const caseId = activeRow.id

    const [msgCountResult, lastMsgResult, reportResult] = await Promise.all([
      supabase
        .from("case_messages")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseId),
      supabase
        .from("case_messages")
        .select("created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("case_reports")
        .select("is_finalized, updated_at")
        .eq("case_id", caseId)
        .eq("profile_id", profileId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (msgCountResult.error) {
      throw new Error(
        `[DASHBOARD_HOME] Failed to count case messages: ${msgCountResult.error.message}`,
      )
    }
    if (lastMsgResult.error) {
      throw new Error(
        `[DASHBOARD_HOME] Failed to load last message: ${lastMsgResult.error.message}`,
      )
    }
    if (reportResult.error) {
      throw new Error(
        `[DASHBOARD_HOME] Failed to load case report: ${reportResult.error.message}`,
      )
    }

    const reportRow = reportResult.data
    activeCase = {
      id: activeRow.id,
      startedAt: activeRow.started_at,
      origin: activeRow.origin,
      pendingAction: activeRow.pending_action,
      contextSummary: activeRow.dashboard_chat_context_summary,
      patient: normalizeActivePatient(activeRow.patient),
      messageCount: msgCountResult.count ?? 0,
      lastMessageAt: lastMsgResult.data?.created_at ?? null,
      report: reportRow
        ? {
            isFinalized: reportRow.is_finalized,
            updatedAt: reportRow.updated_at,
          }
        : null,
    }
  }

  const closedRows = (closedRecentResult.data ?? []) as ClosedCaseRow[]
  const recentClosedCases: DashboardHomeRecentClosedCase[] = closedRows.map(
    (row) => {
      const p = normalizeClosedPatient(row.patient)
      return {
        id: row.id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        patientName: p.name,
        responsible: p.responsible,
      }
    },
  )

  return {
    closedCasesCount: closedResult.count ?? 0,
    patientsCount: patientsResult.count ?? 0,
    totalCasesCount: totalCasesResult.count ?? 0,
    prescriptionsCount: prescriptionsResult.count ?? 0,
    medicalCertificatesCount: certificatesResult.count ?? 0,
    activeCase,
    recentClosedCases,
  }
}

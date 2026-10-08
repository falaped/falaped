import type { SupabaseClient } from "@supabase/supabase-js"

import { caseSummaryHeadline } from "@/lib/case-summary-headline"
import { listCaseActivityTimes } from "@/modules/cases/list-case-activity-times"
import type { CaseOrigin } from "@/modules/cases/types"
import type { AuthenticatedUserProfile } from "@/modules/supabase/get-authenticated-user"

export interface DashboardHomeActiveCase {
  id: string
  startedAt: string
  origin: CaseOrigin
  pausedMs: number
  pausedAt: string | null
  /** Datas do que foi salvo na consulta: dizem se ela ficou esquecida aberta. */
  activityAts: string[]
  patient: {
    name: string | null
    birthDate: string | null
    allergies: string | null
    responsible: string | null
  } | null
}

export interface DashboardHomeRecentClosedCase {
  id: string
  startedAt: string
  endedAt: string | null
  patientName: string | null
  birthDate: string | null
  /** Motivo curto, tirado do resumo da consulta. */
  reason: string | null
}

export interface DashboardHomeData {
  /** Zero = 1º acesso. */
  totalCasesCount: number
  activeCase: DashboardHomeActiveCase | null
  recentClosedCases: DashboardHomeRecentClosedCase[]
}

/** Quantas consultas encerradas o Início lista. */
const RECENT_CLOSED_LIMIT = 3

type PatientEmbed<T> = T | T[] | null
const one = <T,>(row: PatientEmbed<T>): T | null => (Array.isArray(row) ? (row[0] ?? null) : row)

/**
 * Início: total de consultas (decide o 1º acesso), a consulta em andamento e as
 * últimas consultas encerradas.
 * @throws Error("[DASHBOARD_HOME] ...") se alguma consulta falhar
 */
export async function getDashboardHomeData(
  supabase: SupabaseClient,
  profile: AuthenticatedUserProfile,
): Promise<DashboardHomeData> {
  const profileId = profile.id

  const [totalResult, activeResult, recentResult] = await Promise.all([
    supabase.from("cases").select("id", { count: "exact", head: true }).eq("profile_id", profileId),
    supabase
      .from("cases")
      .select("id, started_at, origin, patient_id, consultation_paused_ms, consultation_paused_at, patient:patients(name, birth_date, allergies, responsible)")
      .eq("profile_id", profileId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cases")
      .select("id, started_at, ended_at, summary, patient:patients(name, birth_date)")
      .eq("profile_id", profileId)
      .eq("status", "closed")
      .order("ended_at", { ascending: false, nullsFirst: false })
      .limit(RECENT_CLOSED_LIMIT),
  ])

  for (const [label, result] of [
    ["total cases count", totalResult],
    ["active case", activeResult],
    ["recent closed cases", recentResult],
  ] as const) {
    if (result.error) throw new Error(`[DASHBOARD_HOME] Failed to load ${label}: ${result.error.message}`)
  }

  type ActivePatient = { name: string; birth_date: string | null; allergies: string | null; responsible: string | null }
  const active = activeResult.data as
    | {
        id: string
        started_at: string
        origin: CaseOrigin
        patient_id: string | null
        consultation_paused_ms: number | null
        consultation_paused_at: string | null
        patient: PatientEmbed<ActivePatient>
      }
    | null
  const activityAts = active
    ? await listCaseActivityTimes(supabase, active.id, active.patient_id, active.started_at).catch(() => [])
    : []
  const activePatient = active ? one(active.patient) : null

  type RecentRow = {
    id: string
    started_at: string
    ended_at: string | null
    summary: string | null
    patient: PatientEmbed<{ name: string; birth_date: string | null }>
  }

  return {
    totalCasesCount: totalResult.count ?? 0,
    activeCase: active
      ? {
          id: active.id,
          startedAt: active.started_at,
          origin: active.origin,
          pausedMs: Number(active.consultation_paused_ms ?? 0),
          pausedAt: active.consultation_paused_at,
          activityAts,
          patient: activePatient
            ? {
                name: activePatient.name ?? null,
                birthDate: activePatient.birth_date ?? null,
                allergies: activePatient.allergies?.trim() || null,
                responsible: activePatient.responsible ?? null,
              }
            : null,
        }
      : null,
    recentClosedCases: ((recentResult.data ?? []) as RecentRow[]).map((row) => {
      const patient = one(row.patient)
      return {
        id: row.id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        patientName: patient?.name ?? null,
        birthDate: patient?.birth_date ?? null,
        reason: caseSummaryHeadline(row.summary),
      }
    }),
  }
}

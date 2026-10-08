import type { SupabaseClient } from "@supabase/supabase-js"

import { caseSummaryHeadline } from "@/lib/case-summary-headline"
import type { PaymentMethodInput } from "@/lib/schemas/financial-entry"

/** Consulta encerrada citada no Início (sem valor, relatório em rascunho). */
export type HomeDayCase = {
  caseId: string
  patientId: string | null
  patientName: string | null
  birthDate: string | null
  reason: string | null
  endedAt: string
}

export type HomeDay = {
  today: {
    /** Encerradas hoje (a em andamento não entra). */
    closedCount: number
    /** Das encerradas hoje, quantas têm valor lançado. */
    billedCount: number
    prescriptions: number
    certificates: number
    /** Pedidos de exame, encaminhamentos, orientações e relatórios médicos. */
    otherDocuments: number
  }
  month: {
    closedCount: number
    billedCount: number
    /** Formas de pagamento dos lançamentos do mês, da mais usada para a menos usada. */
    paymentMethods: PaymentMethodInput[]
  }
  /** Encerradas no mês sem lançamento válido, mais recente primeiro. */
  unbilled: HomeDayCase[]
  /** Encerradas com relatório da consulta ainda em rascunho. */
  drafts: HomeDayCase[]
  /** Atendidos desde `recentSinceIso` sem peso/altura desde `measuredSinceIso` (ou nunca medidos). */
  staleMeasure: { patientId: string; name: string; birthDate: string | null; lastMeasuredOn: string | null }[]
  /** Lembretes deixados nas últimas consultas encerradas. */
  reminders: { id: string; caseId: string; patientName: string | null; text: string; endedAt: string }[]
}

export type HomeDayWindow = {
  /** Início do dia e do mês no fuso da clínica, ISO. */
  todayStartIso: string
  monthStartIso: string
  /** Início do mês como data (yyyy-MM-dd), para `received_on`. */
  monthStartDate: string
  /** Só entram crianças com consulta a partir desta data, ISO. */
  recentSinceIso: string
  /** Medida mais antiga que esta data (yyyy-MM-dd) conta como "sem medida recente". */
  measuredSinceIso: string
}

/** Consultas cujos lembretes aparecem no Início. */
const REMINDER_CASES = 3
/** Documentos que o Início conta como "outros". */
const OTHER_DOCUMENT_TABLES = ["exam_requests", "referrals", "guidance_documents", "medical_reports"] as const

type PatientEmbed = { id: string; name: string; birth_date: string | null } | { id: string; name: string; birth_date: string | null }[] | null
type CaseRow = { id: string; ended_at: string; summary: string | null; patient: PatientEmbed }
const one = <T,>(row: T | T[] | null): T | null => (Array.isArray(row) ? (row[0] ?? null) : row)

function toHomeDayCase(row: CaseRow): HomeDayCase {
  const patient = one(row.patient)
  return {
    caseId: row.id,
    patientId: patient?.id ?? null,
    patientName: patient?.name ?? null,
    birthDate: patient?.birth_date ?? null,
    reason: caseSummaryHeadline(row.summary),
    endedAt: row.ended_at,
  }
}

function fail(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`[DASHBOARD_HOME] Failed to load ${label}: ${error.message}`)
}

/**
 * Números do dia e do mês, lembretes e pendências do Início, todos a partir de dados
 * que já existem. Não calcula vacina atrasada: o calendário vacinal do app só mostra
 * a posição da criança, nunca atraso (D-11). O valor recebido vem de `get_earnings_summary`.
 * @throws Error("[DASHBOARD_HOME] ...") se alguma consulta falhar
 */
export async function getHomeDay(supabase: SupabaseClient, profileId: string, window: HomeDayWindow): Promise<HomeDay> {
  const countToday = (table: string) =>
    supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .gte("created_at", window.todayStartIso)

  const [monthResult, recentResult, lastResult, draftsResult, paymentsResult, ...docResults] = await Promise.all([
    supabase
      .from("cases")
      .select("id, ended_at, summary, patient:patients(id, name, birth_date)")
      .eq("profile_id", profileId)
      .eq("status", "closed")
      .gte("ended_at", window.monthStartIso)
      .order("ended_at", { ascending: false }),
    supabase
      .from("cases")
      .select("patient_id")
      .eq("profile_id", profileId)
      .not("patient_id", "is", null)
      .gte("started_at", window.recentSinceIso)
      .order("started_at", { ascending: false })
      // ponytail: últimas 300 consultas bastam para a lista curta do Início.
      .limit(300),
    supabase
      .from("cases")
      .select("id, ended_at, patient:patients(id, name, birth_date)")
      .eq("profile_id", profileId)
      .eq("status", "closed")
      .order("ended_at", { ascending: false, nullsFirst: false })
      .limit(REMINDER_CASES),
    supabase
      .from("case_reports")
      .select("case:cases!inner(id, status, ended_at, summary, patient:patients(id, name, birth_date))")
      .eq("profile_id", profileId)
      .eq("is_finalized", false)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("financial_entries")
      .select("payment_method")
      .eq("profile_id", profileId)
      .is("voided_at", null)
      .gte("received_on", window.monthStartDate),
    countToday("prescriptions"),
    countToday("medical_certificates"),
    ...OTHER_DOCUMENT_TABLES.map(countToday),
  ])
  fail("closed cases of the month", monthResult.error)
  fail("recent cases", recentResult.error)
  fail("last closed cases", lastResult.error)
  fail("draft reports", draftsResult.error)
  fail("payments of the month", paymentsResult.error)
  for (const result of docResults) fail("documents of today", result.error)

  const monthRows = (monthResult.data ?? []) as CaseRow[]
  const monthIds = monthRows.map((row) => row.id)
  const lastRows = (lastResult.data ?? []) as Omit<CaseRow, "summary">[]
  const lastIds = lastRows.map((row) => row.id)
  const patientIds = [...new Set((recentResult.data ?? []).map((row) => row.patient_id as string))]

  const [entriesResult, patientsResult, measurementsResult, remindersResult] = await Promise.all([
    monthIds.length
      ? supabase.from("financial_entries").select("case_id").eq("profile_id", profileId).is("voided_at", null).in("case_id", monthIds)
      : Promise.resolve({ data: [], error: null }),
    patientIds.length
      ? supabase.from("patients").select("id, name, birth_date").eq("profile_id", profileId).in("id", patientIds)
      : Promise.resolve({ data: [], error: null }),
    patientIds.length
      ? supabase
          .from("patient_measurements")
          .select("patient_id, measured_on")
          .eq("profile_id", profileId)
          .in("patient_id", patientIds)
          .order("measured_on", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    lastIds.length
      ? supabase
          .from("case_reminders")
          .select("id, case_id, text, created_at")
          .eq("profile_id", profileId)
          .in("case_id", lastIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])
  fail("entries", entriesResult.error)
  fail("patients", patientsResult.error)
  fail("measurements", measurementsResult.error)
  fail("reminders", remindersResult.error)

  const billed = new Set((entriesResult.data ?? []).map((row) => row.case_id as string))
  const todayRows = monthRows.filter((row) => row.ended_at >= window.todayStartIso)

  const methodCount = new Map<PaymentMethodInput, number>()
  for (const row of paymentsResult.data ?? []) {
    const method = row.payment_method as PaymentMethodInput
    methodCount.set(method, (methodCount.get(method) ?? 0) + 1)
  }

  const lastMeasured = new Map<string, string>()
  for (const row of measurementsResult.data ?? []) {
    if (!lastMeasured.has(row.patient_id as string)) lastMeasured.set(row.patient_id as string, row.measured_on as string)
  }
  const patientById = new Map((patientsResult.data ?? []).map((p) => [p.id as string, p]))
  const staleMeasure: HomeDay["staleMeasure"] = []
  // Mantém a ordem "atendido mais recentemente primeiro".
  for (const id of patientIds) {
    const patient = patientById.get(id)
    if (!patient) continue
    const last = lastMeasured.get(id) ?? null
    if (!last || last < window.measuredSinceIso) {
      staleMeasure.push({ patientId: id, name: patient.name as string, birthDate: (patient.birth_date as string | null) ?? null, lastMeasuredOn: last })
    }
  }

  // Lembretes na ordem das consultas (mais recente primeiro).
  const lastById = new Map(lastRows.map((row) => [row.id, row]))
  const reminders = (remindersResult.data ?? [])
    .map((row) => ({ row, consult: lastById.get(row.case_id as string) }))
    .filter((item): item is { row: (typeof item)["row"]; consult: Omit<CaseRow, "summary"> } => !!item.consult)
    .sort((a, b) => b.consult.ended_at.localeCompare(a.consult.ended_at))
    .map(({ row, consult }) => ({
      id: row.id as string,
      caseId: consult.id,
      patientName: one(consult.patient)?.name ?? null,
      text: row.text as string,
      endedAt: consult.ended_at,
    }))

  const [prescriptions, certificates, ...others] = docResults.map((result) => result.count ?? 0)
  const drafts = (draftsResult.data ?? [])
    .map((row) => one(row.case as (CaseRow & { status: string }) | (CaseRow & { status: string })[] | null))
    .filter((row): row is CaseRow & { status: string } => row?.status === "closed" && !!row.ended_at)
    .map(toHomeDayCase)

  return {
    today: {
      closedCount: todayRows.length,
      billedCount: todayRows.filter((row) => billed.has(row.id)).length,
      prescriptions,
      certificates,
      otherDocuments: others.reduce((sum, count) => sum + count, 0),
    },
    month: {
      closedCount: monthRows.length,
      billedCount: monthRows.filter((row) => billed.has(row.id)).length,
      paymentMethods: [...methodCount].sort((a, b) => b[1] - a[1]).map(([method]) => method),
    },
    unbilled: monthRows.filter((row) => !billed.has(row.id)).map(toHomeDayCase),
    drafts,
    staleMeasure,
    reminders,
  }
}

import type { SupabaseClient } from "@supabase/supabase-js"

import { caseSummaryHeadline } from "@/lib/case-summary-headline"
import { listCaseActivityTimes } from "@/modules/cases/list-case-activity-times"
import type { CaseOrigin, CaseStatus } from "@/modules/cases/types"
import type { DashboardHomeActiveCase } from "@/modules/dashboard/get-dashboard-home-data"

/** Uma linha da lista de Consultas (protótipo b1). */
export type ConsultationRow = {
  id: string
  status: CaseStatus
  origin: CaseOrigin
  startedAt: string
  endedAt: string | null
  /** Tempo com o cronômetro pausado, descontado da duração. */
  pausedMs: number
  patient: { id: string; name: string; birthDate: string | null; responsible: string | null; contactPhone: string | null } | null
  /** Motivo curto, tirado do resumo da consulta. */
  reason: string | null
  /** Rótulos dos documentos emitidos na consulta, na ordem de DOCUMENT_TABLES. */
  documents: string[]
  /** Relatório da consulta ainda em rascunho. */
  reportDraft: boolean
  /** Soma dos lançamentos válidos; null = nada lançado. */
  billedCents: number | null
}

export type Consultations = {
  active: DashboardHomeActiveCase | null
  /** Todas as outras, mais recente primeiro. */
  rows: ConsultationRow[]
}

/** Tabelas de documento com `case_id` e o rótulo que a lista mostra. */
const DOCUMENT_TABLES = [
  ["prescriptions", "Receita"],
  ["medical_certificates", "Atestado"],
  ["exam_requests", "Exames"],
  ["referrals", "Encaminhamento"],
  ["guidance_documents", "Orientação"],
  ["medical_reports", "Relatório"],
] as const

type PatientEmbed = {
  id: string
  name: string
  birth_date: string | null
  responsible: string | null
  contact_phone: string | null
  allergies: string | null
}
type CaseRow = {
  id: string
  status: CaseStatus
  origin: CaseOrigin
  started_at: string
  ended_at: string | null
  consultation_paused_ms: number | null
  consultation_paused_at: string | null
  summary: string | null
  patient: PatientEmbed | PatientEmbed[] | null
}
const one = <T,>(row: T | T[] | null): T | null => (Array.isArray(row) ? (row[0] ?? null) : row)

function fail(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`[CASES] Failed to load ${label}: ${error.message}`)
}

/**
 * Consultas do médico com o que a lista precisa: motivo, documentos emitidos, relatório
 * em rascunho e valor lançado. A consulta em andamento mais recente vem à parte.
 * Com `patientId`, só as consultas dessa criança (ficha).
 * @throws Error("[CASES] ...") se alguma consulta falhar
 */
export async function getConsultations(supabase: SupabaseClient, profileId: string, patientId?: string): Promise<Consultations> {
  let casesQuery = supabase
    .from("cases")
    .select(
      "id, status, origin, started_at, ended_at, consultation_paused_ms, consultation_paused_at, summary, patient:patients(id, name, birth_date, responsible, contact_phone, allergies)",
    )
    .eq("profile_id", profileId)
    .order("started_at", { ascending: false })
  if (patientId) casesQuery = casesQuery.eq("patient_id", patientId)

  // ponytail: tudo de uma vez, sem paginar; paginar quando um médico passar de alguns milhares.
  const [casesResult, entriesResult, draftsResult, ...docResults] = await Promise.all([
    casesQuery,
    supabase.from("financial_entries").select("case_id, amount_cents").eq("profile_id", profileId).is("voided_at", null).not("case_id", "is", null),
    supabase.from("case_reports").select("case_id").eq("profile_id", profileId).eq("is_finalized", false),
    ...DOCUMENT_TABLES.map(([table]) => supabase.from(table).select("case_id").eq("profile_id", profileId).not("case_id", "is", null)),
  ])
  fail("cases", casesResult.error)
  fail("entries", entriesResult.error)
  fail("draft reports", draftsResult.error)
  for (const result of docResults) fail("documents", result.error)

  const billed = new Map<string, number>()
  for (const row of entriesResult.data ?? []) {
    billed.set(row.case_id as string, (billed.get(row.case_id as string) ?? 0) + (row.amount_cents as number))
  }
  const drafts = new Set((draftsResult.data ?? []).map((row) => row.case_id as string))
  const documents = new Map<string, string[]>()
  docResults.forEach((result, index) => {
    const label = DOCUMENT_TABLES[index][1]
    for (const row of result.data ?? []) {
      const list = documents.get(row.case_id as string) ?? []
      if (!list.includes(label)) documents.set(row.case_id as string, [...list, label])
    }
  })

  const cases = (casesResult.data ?? []) as CaseRow[]
  const activeRow = cases.find((row) => row.status === "active") ?? null
  const activePatient = activeRow ? one(activeRow.patient) : null
  const activityAts = activeRow
    ? await listCaseActivityTimes(supabase, activeRow.id, activePatient?.id ?? null, activeRow.started_at).catch(() => [])
    : []

  return {
    active: activeRow
      ? {
          id: activeRow.id,
          startedAt: activeRow.started_at,
          origin: activeRow.origin,
          pausedMs: Number(activeRow.consultation_paused_ms ?? 0),
          pausedAt: activeRow.consultation_paused_at,
          activityAts,
          patient: activePatient
            ? {
                name: activePatient.name,
                birthDate: activePatient.birth_date,
                allergies: activePatient.allergies?.trim() || null,
                responsible: activePatient.responsible,
              }
            : null,
        }
      : null,
    rows: cases
      .filter((row) => row !== activeRow)
      .map((row) => {
        const patient = one(row.patient)
        return {
          id: row.id,
          status: row.status,
          origin: row.origin,
          startedAt: row.started_at,
          endedAt: row.ended_at,
          pausedMs: row.consultation_paused_ms ?? 0,
          patient: patient
            ? {
                id: patient.id,
                name: patient.name,
                birthDate: patient.birth_date,
                responsible: patient.responsible,
                contactPhone: patient.contact_phone,
              }
            : null,
          reason: caseSummaryHeadline(row.summary),
          documents: documents.get(row.id) ?? [],
          reportDraft: drafts.has(row.id),
          billedCents: billed.get(row.id) ?? null,
        }
      }),
  }
}

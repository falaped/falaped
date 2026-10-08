import type { SupabaseClient } from "@supabase/supabase-js"

import { caseSummaryHeadline } from "@/lib/case-summary-headline"
import type { HomeDayCase } from "@/modules/dashboard/get-home-day"

export type MonthBilling = {
  /** Consultas encerradas no mês. */
  closedCount: number
  /** Das encerradas, quantas têm lançamento válido. */
  billedCount: number
  /** Encerradas sem lançamento válido e sem "Foi cortesia", mais recente primeiro. */
  unbilled: HomeDayCase[]
}

type PatientEmbed = { id: string; name: string; birth_date: string | null }
type CaseRow = {
  id: string
  ended_at: string
  summary: string | null
  earnings_prompted_at: string | null
  patient: PatientEmbed | PatientEmbed[] | null
}

/**
 * Cobrança das consultas encerradas na janela [fromIso, toIso) — o mesmo critério do Início
 * (get-home-day.ts), para qualquer mês do Financeiro.
 * @throws Error("[EARNINGS] ...") se alguma leitura falhar
 */
export async function getMonthBilling(
  supabase: SupabaseClient,
  profileId: string,
  fromIso: string,
  toIso: string,
): Promise<MonthBilling> {
  const { data, error } = await supabase
    .from("cases")
    .select("id, ended_at, summary, earnings_prompted_at, patient:patients(id, name, birth_date)")
    .eq("profile_id", profileId)
    .eq("status", "closed")
    .gte("ended_at", fromIso)
    .lt("ended_at", toIso)
    .order("ended_at", { ascending: false })
  if (error) throw new Error(`[EARNINGS] Failed to load closed cases: ${error.message}`)
  const rows = (data ?? []) as CaseRow[]

  const ids = rows.map((row) => row.id)
  const entries = ids.length
    ? await supabase.from("financial_entries").select("case_id").eq("profile_id", profileId).is("voided_at", null).in("case_id", ids)
    : { data: [], error: null }
  if (entries.error) throw new Error(`[EARNINGS] Failed to load case entries: ${entries.error.message}`)
  const billed = new Set((entries.data ?? []).map((row) => row.case_id as string))

  return {
    closedCount: rows.length,
    billedCount: rows.filter((row) => billed.has(row.id)).length,
    unbilled: rows
      .filter((row) => !billed.has(row.id) && !row.earnings_prompted_at)
      .map((row) => {
        const patient = Array.isArray(row.patient) ? (row.patient[0] ?? null) : row.patient
        return {
          caseId: row.id,
          patientId: patient?.id ?? null,
          patientName: patient?.name ?? null,
          birthDate: patient?.birth_date ?? null,
          reason: caseSummaryHeadline(row.summary),
          endedAt: row.ended_at,
        }
      }),
  }
}

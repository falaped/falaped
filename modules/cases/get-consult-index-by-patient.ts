import type { SupabaseClient } from "@supabase/supabase-js"

import type { CaseOrigin } from "@/modules/cases/types"

export type ConsultIndexByPatient = {
  /** Início da consulta mais recente de cada criança (ISO), por patient_id. */
  lastConsultAt: Record<string, string>
  /** Consulta aberta agora, se houver (só uma por vez). */
  activeCase: {
    id: string
    origin: CaseOrigin
    startedAt: string
    patientId: string | null
    pausedMs: number
    pausedAt: string | null
  } | null
}

/**
 * Última consulta por criança e a consulta aberta, para os "Recentes" da busca.
 * @throws Error("[CASES] ...") se a consulta falhar
 */
export async function getConsultIndexByPatient(supabase: SupabaseClient, profileId: string): Promise<ConsultIndexByPatient> {
  const { data, error } = await supabase
    .from("cases")
    .select("id, origin, status, started_at, patient_id, consultation_paused_ms, consultation_paused_at")
    .eq("profile_id", profileId)
    .order("started_at", { ascending: false })
    // ponytail: últimas 500 consultas bastam para os Recentes; criança sem consulta nelas só aparece buscando.
    .limit(500)
  if (error) throw new Error(`[CASES] Failed to load consult index: ${error.message}`)

  const lastConsultAt: Record<string, string> = {}
  let activeCase: ConsultIndexByPatient["activeCase"] = null
  for (const row of data ?? []) {
    if (row.patient_id && !lastConsultAt[row.patient_id]) lastConsultAt[row.patient_id] = row.started_at
    if (!activeCase && row.status === "active") {
      activeCase = {
        id: row.id,
        origin: row.origin,
        startedAt: row.started_at,
        patientId: row.patient_id,
        pausedMs: Number(row.consultation_paused_ms ?? 0),
        pausedAt: row.consultation_paused_at ?? null,
      }
    }
  }
  return { lastConsultAt, activeCase }
}

import type { SupabaseClient } from "@supabase/supabase-js"

/** Tudo que a médica salva dentro da consulta. A cobrança fica de fora: nasce no encerrar. */
const CASE_TABLES = [
  "case_messages",
  "case_reminders",
  "case_reports",
  "case_exam_readings",
  "prescriptions",
  "medical_certificates",
  "exam_requests",
  "referrals",
  "guidance_documents",
  "medical_reports",
  "patient_attachments",
  "patient_scale_results",
] as const

const WITH_UPDATED_AT = new Set<string>([
  "case_reports",
  "case_exam_readings",
  "prescriptions",
  "medical_certificates",
  "exam_requests",
  "referrals",
  "guidance_documents",
  "medical_reports",
])

/**
 * Datas (ISO) de cada coisa salva na consulta desde `startedAt`, para saber se ela foi
 * esquecida aberta (ver `lib/consult-idle.ts`). Medidas não têm case_id: entram as da
 * criança salvas depois do início.
 * @throws Error("[CASES] ...") se alguma leitura falhar
 */
export async function listCaseActivityTimes(
  supabase: SupabaseClient,
  caseId: string,
  patientId: string | null,
  startedAt: string,
): Promise<string[]> {
  type Read = PromiseLike<{ data: unknown; error: { message: string } | null }>
  const reads: Read[] = CASE_TABLES.map((table) => {
    const columns = WITH_UPDATED_AT.has(table) ? "created_at, updated_at" : "created_at"
    return supabase.from(table).select(columns as "created_at").eq("case_id", caseId).gte("created_at", startedAt)
  })
  if (patientId) {
    reads.push(
      supabase
        .from("patient_measurements")
        .select("created_at, updated_at")
        .eq("patient_id", patientId)
        .gte("updated_at", startedAt),
    )
  }
  const results = await Promise.all(reads)
  const times: string[] = []
  for (const { data, error } of results) {
    if (error) throw new Error(`[CASES] Failed to load case activity: ${error.message}`)
    for (const row of (data ?? []) as unknown as { created_at: string; updated_at?: string | null }[]) {
      times.push(row.created_at)
      if (row.updated_at) times.push(row.updated_at)
    }
  }
  return times
}

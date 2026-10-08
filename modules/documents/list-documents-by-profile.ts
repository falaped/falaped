import type { SupabaseClient } from "@supabase/supabase-js"

export type DocumentKind = "prescription" | "certificate" | "exam-request" | "referral"

export type DocumentRow = {
  kind: DocumentKind
  id: string
  /** Momento da emissão (created_at): ordena e agrupa a lista. */
  createdAt: string
  payload: Record<string, unknown>
  pdfStoragePath: string | null
  /** Só atestado: comparecimento, médico… */
  certificateType: string | null
  patient: { id: string; name: string; birthDate: string | null } | null
  /** Nome digitado no documento, quando não há criança ligada. */
  payloadPatientName: string | null
  /** Consulta de onde saiu; null = fora da consulta. */
  case: { id: string; startedAt: string } | null
}

const TABLES: Array<[DocumentKind, string]> = [
  ["prescription", "prescriptions"],
  ["certificate", "medical_certificates"],
  ["exam-request", "exam_requests"],
  ["referral", "referrals"],
]

type Raw = {
  id: string
  created_at: string
  payload: Record<string, unknown> | null
  pdf_storage_path: string | null
  type?: string
  patient: { id: string; name: string; birth_date: string | null } | null
  case: { id: string; started_at: string } | null
}

/**
 * Todos os documentos emitidos pelo médico (receitas, atestados, pedidos de exame e
 * encaminhamentos), do mais recente ao mais antigo, com a criança e a consulta de origem.
 * ponytail: lista inteira por médico; paginar no banco se passar de alguns milhares.
 */
export async function listDocumentsByProfile(supabase: SupabaseClient, profileId: string): Promise<DocumentRow[]> {
  const lists = await Promise.all(
    TABLES.map(async ([kind, table]) => {
      const { data, error } = await supabase
        .from(table)
        .select(
          `id, created_at, payload, pdf_storage_path${kind === "certificate" ? ", type" : ""}, patient:patients(id, name, birth_date), case:cases(id, started_at)`,
        )
        .eq("profile_id", profileId)
      if (error) throw new Error(`[DOCUMENTS] Failed to list ${table}: ${error.message}`)
      return ((data ?? []) as unknown as Raw[]).map(
        (row): DocumentRow => ({
          kind,
          id: row.id,
          createdAt: row.created_at,
          payload: row.payload ?? {},
          pdfStoragePath: row.pdf_storage_path,
          certificateType: row.type ?? null,
          patient: row.patient
            ? { id: row.patient.id, name: row.patient.name, birthDate: row.patient.birth_date }
            : null,
          payloadPatientName: typeof row.payload?.patientName === "string" ? row.payload.patientName : null,
          case: row.case ? { id: row.case.id, startedAt: row.case.started_at } : null,
        }),
      )
    }),
  )
  return lists.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

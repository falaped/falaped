import type { ConsultationRow } from "@/modules/cases/get-consultations"

/**
 * Pendência da lista de Consultas, com a mesma régua do Início: relatório em rascunho,
 * consulta sem paciente ou encerrada no mês sem valor lançado (cortesia não conta).
 */
export function isConsultationPending(row: ConsultationRow, monthStartIso: string): boolean {
  if (row.reportDraft || !row.patient) return true
  return row.status === "closed" && row.billedCents === null && !row.courtesy && !!row.endedAt && row.endedAt >= monthStartIso
}

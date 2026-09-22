import type { ProfileUsageRow } from "@/modules/admin/list-profile-usage"

/**
 * Soma dos documentos emitidos por uma conta — é o número que diz se ela virou rotina.
 *
 * Mora aqui, e não junto do grid, porque o card (client) e a faixa de totais da página
 * (server) somam a MESMA coisa: exportar de um arquivo `"use client"` quebra a página em
 * runtime, sem o build reclamar.
 */
export function documentsTotal(row: ProfileUsageRow): number {
  return (
    row.prescriptions +
    row.certificates +
    row.referrals +
    row.reports +
    row.case_reports +
    row.exam_requests +
    row.guidance
  )
}

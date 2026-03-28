export type CaseReportSourceSummary = {
  source: string
}

/**
 * Whether a new web case report can be generated (matches CaseReport client rules).
 */
export function canGenerateCaseReport(params: {
  caseReports: CaseReportSourceSummary[]
  hasMessages: boolean
  templateSectionCount: number
  hasTemplate: boolean
}): boolean {
  if (!params.hasTemplate) return false
  const hasWebReport = params.caseReports.some((r) => r.source === "web")
  return (
    params.hasMessages &&
    params.templateSectionCount > 0 &&
    !hasWebReport
  )
}

export function caseReportGenerateDisabledReason(params: {
  caseReports: CaseReportSourceSummary[]
  hasMessages: boolean
  templateSectionCount: number
  hasTemplate: boolean
}): string | null {
  if (!params.hasTemplate) {
    return "Nenhum modelo de relatório configurado para este perfil."
  }
  const hasWebReport = params.caseReports.some((r) => r.source === "web")
  if (hasWebReport) {
    return "Já existe um relatório gerado pela web para este caso."
  }
  if (!params.hasMessages) {
    return "É necessário haver mensagens no histórico do caso para gerar o relatório."
  }
  if (params.templateSectionCount === 0) {
    return "O modelo de relatório não possui seções configuradas."
  }
  return null
}

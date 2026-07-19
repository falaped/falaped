export type MedicalReportTemplateSnapshot = {
  title?: string
  bodyHtml?: string
}

export type MedicalReportTemplate = {
  id: string
  profile_id: string
  name: string
  snapshot: MedicalReportTemplateSnapshot
  created_at: string
  updated_at: string
}

export type MedicalReportTemplateOption = {
  id: string
  name: string
  created_at: string
  snapshot: MedicalReportTemplateSnapshot
}

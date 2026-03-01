import type { SupabaseClient } from "@supabase/supabase-js"

export type ReportTemplateSection = {
  name: string
  description?: string
  information_not_extracted_reason?: string
}

export type ReportTemplateWithSections = {
  id: string
  name: string
  sections: ReportTemplateSection[]
}

/**
 * Returns a single report template by id with its sections.
 * Used to get the effective template (profile's or default) for the case report UI.
 */
export async function getReportTemplateById(
  supabase: SupabaseClient,
  templateId: string,
): Promise<ReportTemplateWithSections | null> {
  const { data, error } = await supabase
    .from("report_templates")
    .select("id, name, sections")
    .eq("id", templateId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `[REPORT_TEMPLATES] Failed to fetch template: ${error.message}`,
    )
  }

  if (!data) return null

  return data as ReportTemplateWithSections
}

import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReportTemplateWithSections } from "./get-report-template-by-id"

/**
 * Returns the project default report template (is_default = true) with sections.
 * Used when profile.report_template_id is null to get the effective template for the case report.
 */
export async function getDefaultReportTemplate(
  supabase: SupabaseClient,
): Promise<ReportTemplateWithSections | null> {
  const { data, error } = await supabase
    .from("report_templates")
    .select("id, name, sections")
    .eq("is_default", true)
    .maybeSingle()

  if (error) {
    throw new Error(
      `[REPORT_TEMPLATES] Failed to fetch default template: ${error.message}`,
    )
  }

  if (!data) return null

  return data as ReportTemplateWithSections
}

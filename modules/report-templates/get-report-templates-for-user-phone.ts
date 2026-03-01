import type { SupabaseClient } from "@supabase/supabase-js"

export type ReportTemplateOption = {
  id: string
  name: string
  is_default: boolean
}

/**
 * Returns report templates available for the user: templates that belong to the user (user_phone)
 * plus the project default template (is_default = true). Used for profile report_template_id selection.
 */
export async function getReportTemplatesForUserPhone(
  supabase: SupabaseClient,
  userPhone: string | null
): Promise<ReportTemplateOption[]> {
  const base = supabase
    .from("report_templates")
    .select("id, name, is_default")

  const query =
    userPhone != null && userPhone !== ""
      ? base.or(`user_phone.eq.${userPhone},is_default.eq.true`)
      : base.eq("is_default", true)

  const { data, error } = await query
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (error)
    throw new Error(
      `[REPORT_TEMPLATES] Failed to list templates: ${error.message}`
    )

  return (data ?? []) as ReportTemplateOption[]
}

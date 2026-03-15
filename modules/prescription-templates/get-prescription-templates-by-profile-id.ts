import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrescriptionTemplateOption } from "./types"

export type { PrescriptionTemplateOption }

/**
 * Returns prescription templates for the given profile, ordered by name.
 */
export async function getPrescriptionTemplatesByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PrescriptionTemplateOption[]> {
  const { data, error } = await supabase
    .from("prescription_templates")
    .select("id, name, created_at, snapshot")
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(
      `[PRESCRIPTION_TEMPLATES] Failed to list templates: ${error.message}`,
    )
  }

  return (data ?? []) as PrescriptionTemplateOption[]
}

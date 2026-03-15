import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrescriptionTemplateSnapshot } from "./types"

export type CreatePrescriptionTemplateParams = {
  profileId: string
  name: string
  snapshot: PrescriptionTemplateSnapshot
}

/**
 * Creates a prescription template and returns its id.
 */
export async function createPrescriptionTemplate(
  supabase: SupabaseClient,
  params: CreatePrescriptionTemplateParams,
): Promise<string> {
  const { data, error } = await supabase
    .from("prescription_templates")
    .insert({
      profile_id: params.profileId,
      name: params.name.trim(),
      snapshot: params.snapshot as unknown as Record<string, unknown>,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(
      `[PRESCRIPTION_TEMPLATES] create failed: ${error.message}`,
    )
  }

  if (!data?.id) {
    throw new Error("[PRESCRIPTION_TEMPLATES] create returned no id")
  }

  return data.id as string
}

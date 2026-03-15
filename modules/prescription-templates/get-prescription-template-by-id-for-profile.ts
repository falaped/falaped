import type { SupabaseClient } from "@supabase/supabase-js"
import { getPrescriptionTemplateById } from "./get-prescription-template-by-id"
import type { PrescriptionTemplate } from "./types"

/**
 * Returns a prescription template by id only if it belongs to the given profile.
 */
export async function getPrescriptionTemplateByIdForProfile(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<PrescriptionTemplate | null> {
  const template = await getPrescriptionTemplateById(supabase, id)
  if (!template || template.profile_id !== profileId) return null
  return template
}

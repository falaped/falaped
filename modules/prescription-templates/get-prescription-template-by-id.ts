import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrescriptionTemplate } from "./types"

/**
 * Returns a prescription template by id. Does not check profile ownership.
 * Caller should validate profile_id when needed.
 */
export async function getPrescriptionTemplateById(
  supabase: SupabaseClient,
  id: string,
): Promise<PrescriptionTemplate | null> {
  const { data, error } = await supabase
    .from("prescription_templates")
    .select("id, profile_id, name, snapshot, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(
      `[PRESCRIPTION_TEMPLATES] Failed to get template: ${error.message}`,
    )
  }

  return data as PrescriptionTemplate | null
}

import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrescriptionTemplateSnapshot } from "./types"

export type UpdatePrescriptionTemplateParams = {
  name?: string
  snapshot?: PrescriptionTemplateSnapshot
}

/**
 * Updates a prescription template by id. Does not check profile ownership.
 * Caller must ensure the template belongs to the current user.
 */
export async function updatePrescriptionTemplate(
  supabase: SupabaseClient,
  id: string,
  params: UpdatePrescriptionTemplateParams,
): Promise<void> {
  const updates: Record<string, unknown> = {}
  if (params.name !== undefined) updates.name = params.name.trim()
  if (params.snapshot !== undefined) updates.snapshot = params.snapshot

  if (Object.keys(updates).length === 0) return

  const { error } = await supabase
    .from("prescription_templates")
    .update(updates)
    .eq("id", id)

  if (error) {
    throw new Error(
      `[PRESCRIPTION_TEMPLATES] update failed: ${error.message}`,
    )
  }
}

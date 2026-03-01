import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Deletes a case and related data: case, case_messages (cascade or explicit),
 * incoming_webhook_events and trigger_buffer_runs for the user's phone.
 * Case ownership is verified via user_phone resolved from profile_id.
 */
export async function deleteCase(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<void> {
  const { data: auRow, error: auError } = await supabase
    .from("authenticated_users")
    .select("phone")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (auError) throw new Error(`[CASES] Failed to resolve phone: ${auError.message}`)
  const userPhone = auRow?.phone ?? null
  if (!userPhone) throw new Error("[CASES] No phone linked to profile.")

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .maybeSingle()

  if (caseError) throw new Error(`[CASES] Failed to fetch case: ${caseError.message}`)
  if (!caseRow) throw new Error("[CASES] Case not found or does not belong to profile.")

  const { error: deleteCaseError } = await supabase
    .from("cases")
    .delete()
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .select("id")
    .single()

  if (deleteCaseError) throw new Error(`[CASES] Failed to delete case: ${deleteCaseError.message}`)

  const { error: deleteWebhookError } = await supabase
    .from("incoming_webhook_events")
    .delete()
    .eq("phone", userPhone)

  if (deleteWebhookError) {
    throw new Error(
      `[CASES] Failed to delete incoming_webhook_events: ${deleteWebhookError.message}`,
    )
  }

  const { error: deleteBufferError } = await supabase
    .from("trigger_buffer_runs")
    .delete()
    .eq("phone", userPhone)

  if (deleteBufferError) {
    throw new Error(`[CASES] Failed to delete trigger_buffer_runs: ${deleteBufferError.message}`)
  }
}

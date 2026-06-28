import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Resets the consultation timer for a case back to zero: re-anchors `started_at`
 * to now and clears the pause accumulator/flag. No-op if the case is ended.
 * Ownership via user_phone resolved from profile_id (cases are scoped by
 * user_phone, never by id alone).
 */
export async function resetConsultation(
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
    .select("id, ended_at")
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .maybeSingle()

  if (caseError) throw new Error(`[CASES] Failed to fetch case: ${caseError.message}`)
  if (!caseRow) throw new Error("[CASES] Case not found or does not belong to profile.")

  // Ended consultation: nothing to reset.
  if (caseRow.ended_at != null) return

  const { error: updateError } = await supabase
    .from("cases")
    .update({
      started_at: new Date().toISOString(),
      consultation_paused_ms: 0,
      consultation_paused_at: null,
    })
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .select("id")
    .single()

  if (updateError) throw new Error(`[CASES] Failed to reset consultation: ${updateError.message}`)
}

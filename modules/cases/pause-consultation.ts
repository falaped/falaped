import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Pauses the consultation timer for a case by stamping `consultation_paused_at`.
 * No-op if the case is already paused or already ended.
 * Ownership via user_phone resolved from profile_id (cases are scoped by
 * user_phone, never by id alone).
 */
export async function pauseConsultation(
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
    .select("id, ended_at, consultation_paused_at")
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .maybeSingle()

  if (caseError) throw new Error(`[CASES] Failed to fetch case: ${caseError.message}`)
  if (!caseRow) throw new Error("[CASES] Case not found or does not belong to profile.")

  // Already ended or already paused: nothing to do.
  if (caseRow.ended_at != null) return
  if (caseRow.consultation_paused_at != null) return

  const { error: updateError } = await supabase
    .from("cases")
    .update({ consultation_paused_at: new Date().toISOString() })
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .select("id")
    .single()

  if (updateError) throw new Error(`[CASES] Failed to pause consultation: ${updateError.message}`)
}

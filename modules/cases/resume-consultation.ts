import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Resumes the consultation timer for a case: accumulates the elapsed paused
 * interval into `consultation_paused_ms` and clears `consultation_paused_at`.
 * No-op if the case is not currently paused.
 * Ownership via user_phone resolved from profile_id (cases are scoped by
 * user_phone, never by id alone).
 */
export async function resumeConsultation(
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
    .select("id, consultation_paused_ms, consultation_paused_at")
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .maybeSingle()

  if (caseError) throw new Error(`[CASES] Failed to fetch case: ${caseError.message}`)
  if (!caseRow) throw new Error("[CASES] Case not found or does not belong to profile.")

  // Not currently paused: nothing to do.
  if (caseRow.consultation_paused_at == null) return

  const currentPausedMs = Number(caseRow.consultation_paused_ms ?? 0)
  const addedMs = Math.max(
    0,
    Date.now() - new Date(caseRow.consultation_paused_at).getTime(),
  )

  const { error: updateError } = await supabase
    .from("cases")
    .update({
      consultation_paused_ms: currentPausedMs + addedMs,
      consultation_paused_at: null,
    })
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .select("id")
    .single()

  if (updateError) throw new Error(`[CASES] Failed to resume consultation: ${updateError.message}`)
}

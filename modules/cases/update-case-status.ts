import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Updates case status to active or closed.
 * When reopening: closes any other active case for the same user first (only one active case per user).
 * Case ownership via user_phone resolved from profile_id.
 */
export async function updateCaseStatus(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
  status: "active" | "closed",
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

  if (status === "active") {
    const endedAt = new Date().toISOString()
    const { error: closeOthersError } = await supabase
      .from("cases")
      .update({ status: "closed", ended_at: endedAt })
      .eq("user_phone", userPhone)
      .eq("status", "active")

    if (closeOthersError) {
      throw new Error(`[CASES] Failed to close other active cases: ${closeOthersError.message}`)
    }
  }

  const payload =
    status === "closed"
      ? { status: "closed" as const, ended_at: new Date().toISOString() }
      : { status: "active" as const, ended_at: null }

  const { error: updateError } = await supabase
    .from("cases")
    .update(payload)
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .select("id")
    .single()

  if (updateError) throw new Error(`[CASES] Failed to update case status: ${updateError.message}`)
}

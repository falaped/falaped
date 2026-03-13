import type { SupabaseClient } from "@/lib/supabase/types"

/**
 * Updates discussion status to active or closed.
 * When reopening: closes any other active discussion for the same profile first (one active per profile).
 * Ownership via profile_id.
 */
export async function updateDiscussionStatus(
  supabase: SupabaseClient,
  discussionId: string,
  profileId: string,
  status: "active" | "closed",
): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from("discussions")
    .select("id")
    .eq("id", discussionId)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (fetchError) throw new Error(`[DISCUSSIONS] Failed to fetch discussion: ${fetchError.message}`)
  if (!row) throw new Error("[DISCUSSIONS] Discussion not found or does not belong to profile.")

  if (status === "active") {
    const endedAt = new Date().toISOString()
    const { error: closeOthersError } = await supabase
      .from("discussions")
      .update({ status: "closed", ended_at: endedAt })
      .eq("profile_id", profileId)
      .eq("status", "active")

    if (closeOthersError) {
      throw new Error(
        `[DISCUSSIONS] Failed to close other active discussions: ${closeOthersError.message}`,
      )
    }
  }

  const payload =
    status === "closed"
      ? { status: "closed" as const, ended_at: new Date().toISOString() }
      : { status: "active" as const, ended_at: null }

  const { error: updateError } = await supabase
    .from("discussions")
    .update(payload)
    .eq("id", discussionId)
    .eq("profile_id", profileId)
    .select("id")
    .single()

  if (updateError) throw new Error(`[DISCUSSIONS] Failed to update status: ${updateError.message}`)
}

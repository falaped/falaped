import type { SupabaseClient } from "@/lib/supabase/types"

/**
 * Deletes a discussion and its messages. Ownership verified via profile_id.
 * Deletes discussion_messages first, then the discussion.
 */
export async function deleteDiscussion(
  supabase: SupabaseClient,
  discussionId: string,
  profileId: string,
): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from("discussions")
    .select("id")
    .eq("id", discussionId)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (fetchError) throw new Error(`[DISCUSSIONS] Failed to fetch discussion: ${fetchError.message}`)
  if (!row) throw new Error("[DISCUSSIONS] Discussion not found or does not belong to profile.")

  const { error: deleteMessagesError } = await supabase
    .from("discussion_messages")
    .delete()
    .eq("discussion_id", discussionId)

  if (deleteMessagesError) {
    throw new Error(
      `[DISCUSSIONS] Failed to delete discussion messages: ${deleteMessagesError.message}`,
    )
  }

  const { error: deleteDiscussionError } = await supabase
    .from("discussions")
    .delete()
    .eq("id", discussionId)
    .eq("profile_id", profileId)
    .select("id")
    .single()

  if (deleteDiscussionError) {
    throw new Error(`[DISCUSSIONS] Failed to delete discussion: ${deleteDiscussionError.message}`)
  }
}

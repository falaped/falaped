import type { SupabaseClient } from "@/lib/supabase/types"

import type { DiscussionWithMessages, DiscussionMessage } from "./types"

export type { DiscussionWithMessages } from "./types"

/**
 * Fetches a single discussion by id and profile_id (ownership).
 * Returns discussion with messages ordered by created_at asc, or null if not found.
 */
export async function getDiscussionById(
  supabase: SupabaseClient,
  discussionId: string,
  profileId: string,
): Promise<DiscussionWithMessages | null> {
  const { data: row, error } = await supabase
    .from("discussions")
    .select(
      `
      id,
      profile_id,
      user_phone,
      status,
      started_at,
      ended_at,
      awaiting_intent,
      title
    `,
    )
    .eq("id", discussionId)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) throw new Error(`[DISCUSSIONS] Failed to fetch discussion: ${error.message}`)
  if (!row) return null

  const { data: messagesRows, error: messagesError } = await supabase
    .from("discussion_messages")
    .select("id, role, content, created_at")
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true })

  if (messagesError) throw new Error(`[DISCUSSIONS] Failed to fetch messages: ${messagesError.message}`)

  const messages: DiscussionMessage[] = (messagesRows ?? []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    created_at: m.created_at,
  }))

  return { ...row, messages } as DiscussionWithMessages
}

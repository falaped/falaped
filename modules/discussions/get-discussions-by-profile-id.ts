import type { SupabaseClient } from "@/lib/supabase/types"

import type { DiscussionWithMessages, DiscussionMessage } from "./types"

export type { DiscussionWithMessages, DiscussionMessage } from "./types"

/**
 * Fetches discussions for a profile with their messages.
 * Discussions ordered by started_at desc; messages by created_at asc.
 */
export async function getDiscussionsByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<DiscussionWithMessages[]> {
  const { data: rows, error } = await supabase
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
    .eq("profile_id", profileId)
    .order("started_at", { ascending: false })

  if (error) throw new Error(`[DISCUSSIONS] Failed to fetch discussions: ${error.message}`)
  if (!rows?.length) return []

  const ids = rows.map((r) => r.id)

  const { data: messagesRows, error: messagesError } = await supabase
    .from("discussion_messages")
    .select("id, discussion_id, role, content, created_at")
    .in("discussion_id", ids)
    .order("created_at", { ascending: true })

  if (messagesError) throw new Error(`[DISCUSSIONS] Failed to fetch messages: ${messagesError.message}`)

  const messagesByDiscussion = new Map<string, DiscussionMessage[]>()
  for (const m of messagesRows ?? []) {
    const msg: DiscussionMessage = {
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      created_at: m.created_at,
    }
    const list = messagesByDiscussion.get(m.discussion_id) ?? []
    list.push(msg)
    messagesByDiscussion.set(m.discussion_id, list)
  }

  return rows.map((r) => ({
    ...r,
    messages: messagesByDiscussion.get(r.id) ?? [],
  })) as DiscussionWithMessages[]
}

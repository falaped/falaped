import type { SupabaseClient } from "@/lib/supabase/types"

/**
 * Updates discussion title. Ownership verified via profile_id.
 */
export async function updateDiscussionTitle(
  supabase: SupabaseClient,
  discussionId: string,
  profileId: string,
  title: string | null,
): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from("discussions")
    .select("id")
    .eq("id", discussionId)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (fetchError) throw new Error(`[DISCUSSIONS] Failed to fetch discussion: ${fetchError.message}`)
  if (!row) throw new Error("[DISCUSSIONS] Discussion not found or does not belong to profile.")

  const { error: updateError } = await supabase
    .from("discussions")
    .update({ title })
    .eq("id", discussionId)
    .eq("profile_id", profileId)
    .select("id")
    .single()

  if (updateError) throw new Error(`[DISCUSSIONS] Failed to update title: ${updateError.message}`)
}

import type { SupabaseClient } from "@supabase/supabase-js"

export async function updateCaseAssistantTurnQueue(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
  assistantTurnQueue: unknown | null,
): Promise<void> {
  const { error } = await supabase
    .from("cases")
    .update({ assistant_turn_queue: assistantTurnQueue })
    .eq("id", caseId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[CASES] Failed to update assistant turn queue: ${error.message}`)
  }
}

import type { SupabaseClient } from "@supabase/supabase-js"

export async function updateCasePendingAction(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
  pendingAction: "close_case" | null,
): Promise<void> {
  const { error } = await supabase
    .from("cases")
    .update({ pending_action: pendingAction })
    .eq("id", caseId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[CASES] Failed to update pending action: ${error.message}`)
  }
}


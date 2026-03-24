import type { SupabaseClient } from "@supabase/supabase-js"

export async function updateCaseDashboardChatContextSummary(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
  summary: string,
): Promise<void> {
  const { error } = await supabase
    .from("cases")
    .update({ dashboard_chat_context_summary: summary })
    .eq("id", caseId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[CASES] Failed to update chat context summary: ${error.message}`)
  }
}


import type { SupabaseClient } from "@supabase/supabase-js"

export type CaseRowForProfile = {
  id: string
  profile_id: string | null
  user_phone: string
  status: "active" | "closed"
  origin: "dashboard" | "whatsapp"
  patient_id: string | null
  pending_action: string | null
  dashboard_chat_context_summary: string | null
}

export async function getCaseRowForProfile(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<CaseRowForProfile | null> {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, profile_id, user_phone, status, origin, patient_id, pending_action, dashboard_chat_context_summary",
    )
    .eq("id", caseId)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    throw new Error(`[CASES] Failed to fetch case row: ${error.message}`)
  }

  return (data as CaseRowForProfile | null) ?? null
}


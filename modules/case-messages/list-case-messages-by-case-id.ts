import type { SupabaseClient } from "@supabase/supabase-js"

export type CaseMessageRow = {
  id: string
  case_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export async function listCaseMessagesByCaseId(
  supabase: SupabaseClient,
  caseId: string,
): Promise<CaseMessageRow[]> {
  const { data, error } = await supabase
    .from("case_messages")
    .select("id, case_id, role, content, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`[CASE_MESSAGES] Failed to list messages: ${error.message}`)
  }

  return (data ?? []) as CaseMessageRow[]
}


import type { SupabaseClient } from "@supabase/supabase-js"

export type InsertCaseMessageInput = {
  caseId: string
  role: "user" | "assistant"
  content: string
}

export type InsertedCaseMessage = {
  id: string
  case_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export async function insertCaseMessage(
  supabase: SupabaseClient,
  input: InsertCaseMessageInput,
): Promise<InsertedCaseMessage> {
  const { data, error } = await supabase
    .from("case_messages")
    .insert({
      case_id: input.caseId,
      role: input.role,
      content: input.content,
    })
    .select("id, case_id, role, content, created_at")
    .single()

  if (error) {
    throw new Error(`[CASE_MESSAGES] Failed to insert message: ${error.message}`)
  }

  return data as InsertedCaseMessage
}


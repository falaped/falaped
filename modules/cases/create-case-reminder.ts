import type { SupabaseClient } from "@supabase/supabase-js"

import type { CaseReminder } from "./types"

export const CASE_REMINDER_SELECT = "id, profile_id, case_id, text, created_at"

/** Registra UM lembrete do atendimento. */
export async function createCaseReminder(
  supabase: SupabaseClient,
  profileId: string,
  caseId: string,
  text: string,
): Promise<CaseReminder> {
  const { data, error } = await supabase
    .from("case_reminders")
    .insert({ profile_id: profileId, case_id: caseId, text: text.trim() })
    .select(CASE_REMINDER_SELECT)
    .single()

  if (error)
    throw new Error(`[CASES] Failed to create reminder: ${error.message}`)

  return data as CaseReminder
}

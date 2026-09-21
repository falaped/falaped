import type { SupabaseClient } from "@supabase/supabase-js"

import { CASE_REMINDER_SELECT } from "./create-case-reminder"
import type { CaseReminder } from "./types"

/** Lembretes de um atendimento, na ordem em que foram escritos. */
export async function listCaseReminders(
  supabase: SupabaseClient,
  profileId: string,
  caseId: string,
): Promise<CaseReminder[]> {
  const { data, error } = await supabase
    .from("case_reminders")
    .select(CASE_REMINDER_SELECT)
    .eq("profile_id", profileId)
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })

  if (error)
    throw new Error(`[CASES] Failed to list reminders: ${error.message}`)

  return (data ?? []) as CaseReminder[]
}

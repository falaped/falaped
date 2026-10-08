import type { SupabaseClient } from "@supabase/supabase-js"

import { closeCaseWithTiming, type CaseTimerRow } from "@/modules/cases/close-case-with-timing"

/**
 * Updates case status to active or closed.
 * When reopening: closes any other active case for the same user first (only one active case per user).
 * Case ownership via user_phone resolved from profile_id.
 * Encerrar grava a duração real (consulta esquecida termina na última atividade);
 * `endedAt` é o horário de término informado pela médica.
 */
export async function updateCaseStatus(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
  status: "active" | "closed",
  endedAt?: string,
): Promise<void> {
  const { data: auRow, error: auError } = await supabase
    .from("authenticated_users")
    .select("phone")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (auError) throw new Error(`[CASES] Failed to resolve phone: ${auError.message}`)
  const userPhone = auRow?.phone ?? null
  if (!userPhone) throw new Error("[CASES] No phone linked to profile.")

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id, started_at, consultation_paused_ms, consultation_paused_at, patient_id")
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .maybeSingle<CaseTimerRow>()

  if (caseError) throw new Error(`[CASES] Failed to fetch case: ${caseError.message}`)
  if (!caseRow) throw new Error("[CASES] Case not found or does not belong to profile.")

  if (status === "closed") {
    await closeCaseWithTiming(supabase, caseRow, endedAt)
    return
  }

  const { data: others, error: othersError } = await supabase
    .from("cases")
    .select("id, started_at, consultation_paused_ms, consultation_paused_at, patient_id")
    .eq("user_phone", userPhone)
    .eq("status", "active")
    .neq("id", caseId)
    .returns<CaseTimerRow[]>()
  if (othersError) {
    throw new Error(`[CASES] Failed to load other active cases: ${othersError.message}`)
  }
  for (const other of others ?? []) await closeCaseWithTiming(supabase, other)

  // Reopening starts a fresh consultation: reset the timer anchor and
  // clear any accumulated/active pause so the cronômetro restarts at 0 (D-02).
  const payload = {
    status: "active" as const,
    ended_at: null,
    started_at: new Date().toISOString(),
    consultation_paused_ms: 0,
    consultation_paused_at: null,
  }

  const { error: updateError } = await supabase
    .from("cases")
    .update(payload)
    .eq("id", caseId)
    .eq("user_phone", userPhone)
    .select("id")
    .single()

  if (updateError) throw new Error(`[CASES] Failed to update case status: ${updateError.message}`)
}

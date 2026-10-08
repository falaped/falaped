import type { SupabaseClient } from "@supabase/supabase-js"

import { closeCaseWithTiming, type CaseTimerRow } from "@/modules/cases/close-case-with-timing"

type ActiveCaseRow = CaseTimerRow & { origin: "dashboard" | "whatsapp" }

export type CreateDashboardCaseWithPatientResult =
  | { type: "created"; caseId: string }
  | { type: "whatsapp_active"; activeCaseId: string }

export async function createDashboardCaseWithPatient(
  supabase: SupabaseClient,
  profileId: string,
  userPhone: string,
  patientId: string,
): Promise<CreateDashboardCaseWithPatientResult> {
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (patientError) {
    throw new Error(`[CASES] Failed to validate patient: ${patientError.message}`)
  }
  if (!patient) {
    throw new Error("Paciente inválido para este perfil.")
  }

  const { data: activeRows, error: activeError } = await supabase
    .from("cases")
    .select("id, origin, started_at, consultation_paused_ms, consultation_paused_at, patient_id")
    .eq("profile_id", profileId)
    .eq("status", "active")

  if (activeError) {
    throw new Error(`[CASES] Failed to fetch active cases: ${activeError.message}`)
  }

  const activeCases = (activeRows ?? []) as ActiveCaseRow[]
  const whatsappCase = activeCases.find((row) => row.origin === "whatsapp")
  if (whatsappCase) {
    return { type: "whatsapp_active", activeCaseId: whatsappCase.id }
  }

  // Encerra a anterior com a duração real: esquecida, termina na última atividade.
  for (const row of activeCases.filter((row) => row.origin === "dashboard")) {
    await closeCaseWithTiming(supabase, row)
  }

  const { data: inserted, error: insertError } = await supabase
    .from("cases")
    .insert({
      profile_id: profileId,
      user_phone: userPhone,
      status: "active",
      origin: "dashboard",
      source: "dashboard",
      patient_id: patientId,
      started_at: new Date().toISOString(),
      pending_action: null,
      dashboard_chat_context_summary: null,
      context_summary: null,
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    throw new Error(`[CASES] Failed to create dashboard case: ${insertError?.message}`)
  }

  return { type: "created", caseId: inserted.id }
}


import type { SupabaseClient } from "@supabase/supabase-js"

type ActiveCaseRow = {
  id: string
  origin: "dashboard" | "whatsapp"
}

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
    .select("id, origin")
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

  const dashboardCaseIds = activeCases
    .filter((row) => row.origin === "dashboard")
    .map((row) => row.id)

  if (dashboardCaseIds.length > 0) {
    const now = new Date().toISOString()
    const { error: closeError } = await supabase
      .from("cases")
      .update({ status: "closed", ended_at: now })
      .in("id", dashboardCaseIds)
      .eq("profile_id", profileId)

    if (closeError) {
      throw new Error(
        `[CASES] Failed to close active dashboard cases: ${closeError.message}`,
      )
    }
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


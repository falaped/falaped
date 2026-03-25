import type { SupabaseClient } from "@supabase/supabase-js"

export type CaseMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export type CasePatientDetail = {
  id: string
  name: string
  birth_date: string | null
  responsible: string | null
  contact_phone: string | null
  sex: string | null
  legal_guardian: string | null
  blood_type: string | null
  weight: string | null
  height: string | null
  head_circumference: string | null
  allergies: string | null
  current_medications: string | null
  medical_history: string | null
}

export type CaseDetail = {
  id: string
  user_phone: string
  status: "active" | "closed"
  origin: "dashboard" | "whatsapp"
  started_at: string
  ended_at: string | null
  patient_id: string | null
  awaiting_intent: boolean
  awaiting_patient_choice: boolean
  pending_action: string | null
  assistant_turn_queue: unknown | null
  dashboard_chat_context_summary: string | null
  patient: CasePatientDetail | null
  messages: CaseMessage[]
}

/**
 * Fetches a single case with its patient and messages for the detail view.
 * Verifies ownership via profile_id (resolves to user_phone from authenticated_users).
 */
export async function getCaseById(
  supabase: SupabaseClient,
  caseId: string,
  profileId: string,
): Promise<CaseDetail | null> {
  const { data: auRow, error: auError } = await supabase
    .from("authenticated_users")
    .select("phone")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (auError) throw new Error(`[CASES] Failed to resolve phone: ${auError.message}`)
  const phone = auRow?.phone ?? null
  if (!phone) return null

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select(`
      id,
      user_phone,
      status,
      origin,
      started_at,
      ended_at,
      patient_id,
      awaiting_intent,
      awaiting_patient_choice,
      pending_action,
      assistant_turn_queue,
      dashboard_chat_context_summary,
      patient:patients(
        id,
        name,
        birth_date,
        responsible,
        contact_phone,
        sex,
        legal_guardian,
        blood_type,
        weight,
        height,
        head_circumference,
        allergies,
        current_medications,
        medical_history
      )
    `)
    .eq("id", caseId)
    .eq("user_phone", phone)
    .maybeSingle()

  if (caseError) throw new Error(`[CASES] Failed to fetch case: ${caseError.message}`)
  if (!caseRow) return null

  const { data: messages, error: messagesError } = await supabase
    .from("case_messages")
    .select("id, role, content, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })

  if (messagesError) throw new Error(`[CASES] Failed to fetch messages: ${messagesError.message}`)

  const patient = Array.isArray(caseRow.patient) ? caseRow.patient[0] : caseRow.patient

  return {
    ...caseRow,
    patient: patient ?? null,
    messages: messages ?? [],
  } as CaseDetail
}

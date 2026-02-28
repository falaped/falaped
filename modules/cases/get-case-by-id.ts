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
  allergies: string | null
  current_medications: string | null
  medical_history: string | null
}

export type CaseDetail = {
  id: string
  user_phone: string
  status: "active" | "closed"
  started_at: string
  ended_at: string | null
  patient_id: string | null
  awaiting_intent: boolean
  awaiting_patient_choice: boolean
  patient: CasePatientDetail | null
  messages: CaseMessage[]
}

/**
 * Fetches a single case with its patient and messages for the detail view.
 * Verifies ownership via user_phone.
 */
export async function getCaseById(
  supabase: SupabaseClient,
  caseId: string,
  userPhone: string,
): Promise<CaseDetail | null> {
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select(`
      id,
      user_phone,
      status,
      started_at,
      ended_at,
      patient_id,
      awaiting_intent,
      awaiting_patient_choice,
      patient:patients(
        id,
        name,
        birth_date,
        responsible,
        contact_phone,
        sex,
        allergies,
        current_medications,
        medical_history
      )
    `)
    .eq("id", caseId)
    .eq("user_phone", userPhone)
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

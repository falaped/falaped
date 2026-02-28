import type { SupabaseClient } from "@supabase/supabase-js"

export type CaseStatus = "active" | "closed" | "all"

export type CasePatient = {
  id: string
  name: string
  responsible: string | null
  contact_phone: string | null
}

export type CaseWithPatient = {
  id: string
  user_phone: string
  status: "active" | "closed"
  started_at: string
  ended_at: string | null
  patient_id: string | null
  awaiting_intent: boolean
  awaiting_patient_choice: boolean
  patient: CasePatient | null
}

/**
 * Fetches cases for a pediatrician, optionally filtered by status.
 * Joins with patients for contact info when patient_id is set.
 */
export async function getCasesByUserPhone(
  supabase: SupabaseClient,
  userPhone: string,
  statusFilter: CaseStatus = "active",
): Promise<CaseWithPatient[]> {
  let query = supabase
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
        responsible,
        contact_phone
      )
    `)
    .eq("user_phone", userPhone)
    .order("started_at", { ascending: false })

  if (statusFilter === "active") {
    query = query.eq("status", "active")
  } else if (statusFilter === "closed") {
    query = query.eq("status", "closed")
  }

  const { data, error } = await query

  if (error) throw new Error(`[CASES] Failed to fetch cases: ${error.message}`)

  return (data ?? []).map((row) => {
    const patient = Array.isArray(row.patient) ? row.patient[0] : row.patient
    return {
      ...row,
      patient: patient ?? null,
    } as CaseWithPatient
  })
}

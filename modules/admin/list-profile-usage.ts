import type { SupabaseClient } from "@supabase/supabase-js"

export type ProfileUsageRow = {
  profile_id: string
  email: string | null
  first_name: string | null
  surname: string | null
  phone: string | null
  crm: string | null
  created_at: string
  status: string | null
  whatsapp_linked_at: string | null
  last_case_at: string | null
  patients: number
  cases: number
  discussions: number
  appointments: number
  prescriptions: number
  certificates: number
  referrals: number
  reports: number
  case_reports: number
  exam_requests: number
  guidance: number
  vaccine_doses: number
  measurements: number
  scales: number
  attachments: number
  financial_entries: number
}

/**
 * Consumo de todos os perfis, do mais ativo para o menos ativo.
 *
 * Exige um client de service role: a view `admin_profile_usage` é `security_invoker`, então
 * um client de sessão devolveria só as contagens do próprio médico.
 */
export async function listProfileUsage(
  supabase: SupabaseClient,
): Promise<ProfileUsageRow[]> {
  const { data, error } = await supabase
    .from("admin_profile_usage")
    .select("*")
    .order("last_case_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) throw new Error(`[ADMIN] Failed to list usage: ${error.message}`)

  return (data ?? []) as ProfileUsageRow[]
}

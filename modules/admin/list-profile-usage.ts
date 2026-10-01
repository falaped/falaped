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
  trial_ends_at: string | null
  /** Maior `valid_until` dos pagamentos lançados; null = pago sem vencimento ou não pago. */
  paid_until: string | null
  /** Último registro de qualquer tipo na conta. */
  last_activity_at: string | null
  /** Último login (vem do Auth, não da view). */
  last_sign_in_at: string | null
  storage_bytes: number
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
 * Consumo de todos os perfis, do mais ativo para o menos ativo, com o último login do Auth.
 *
 * Exige um client de service role: a view `admin_profile_usage` é `security_invoker`, então
 * um client de sessão devolveria só as contagens do próprio médico. O service role não lê
 * `auth.users` pela view, então o login vem da Admin API do Auth.
 */
export async function listProfileUsage(
  supabase: SupabaseClient,
): Promise<ProfileUsageRow[]> {
  const [usage, profiles, auth] = await Promise.all([
    supabase
      .from("admin_profile_usage")
      .select("*")
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, auth_user_id"),
    // ponytail: uma página de 1000 contas; paginar quando passar disso.
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  if (usage.error) throw new Error(`[ADMIN] Failed to list usage: ${usage.error.message}`)
  if (profiles.error) throw new Error(`[ADMIN] Failed to list profiles: ${profiles.error.message}`)
  if (auth.error) throw new Error(`[ADMIN] Failed to list auth users: ${auth.error.message}`)

  const signInByAuthId = new Map(auth.data.users.map((u) => [u.id, u.last_sign_in_at ?? null]))
  const authIdByProfile = new Map((profiles.data ?? []).map((p) => [p.id, p.auth_user_id as string | null]))

  return (usage.data ?? []).map((row) => {
    const authId = authIdByProfile.get(row.profile_id)
    return {
      ...row,
      storage_bytes: Number(row.storage_bytes),
      last_sign_in_at: authId ? (signInByAuthId.get(authId) ?? null) : null,
    }
  }) as ProfileUsageRow[]
}

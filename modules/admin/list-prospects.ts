import type { SupabaseClient } from "@supabase/supabase-js"

/** Etapas gravadas. "Em teste" e "Cliente" saem do perfil vinculado (ver `funnelStage`). */
export const PROSPECT_STATUSES = ["novo", "contatado", "respondeu", "perdido"] as const
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]

export const CONTACT_CHANNELS = ["email", "whatsapp", "telefone"] as const
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]

/** Dias até o próximo toque, por canal do toque que acabou de acontecer. */
export const FOLLOW_UP_DAYS: Record<ContactChannel, number> = { email: 3, whatsapp: 7, telefone: 7 }

export type EmailStatus = "enviado" | "entregue" | "aberto" | "clicou" | "bounce" | "reclamou"

/** O que o perfil que se cadastrou com o mesmo e-mail já fez no produto. */
export type ProspectProfile = { id: string; status: string | null; created_at: string; cases: number }

export type ProspectRow = {
  id: string
  kind: "médico" | "clínica"
  title: string | null
  name: string
  full_name: string
  city: string | null
  email: string | null
  site_emails: string[]
  phone: string | null
  has_whatsapp: boolean
  crm: string | null
  rqe: string | null
  clinic: string | null
  address: string | null
  website: string | null
  profile_url: string | null
  map_url: string | null
  sources: string[]
  price: string | null
  rating: string | null
  reviews: string | null
  status: ProspectStatus
  lost_reason: string | null
  origin: "captacao" | "landing" | "manual"
  lead_at: string | null
  lead_source: string | null
  replied_at: string | null
  opened_at: string | null
  clicked_at: string | null
  notes: string
  invited_at: string | null
  invite_count: number
  next_contact_at: string | null
  last_contact_at: string | null
  last_channel: ContactChannel | null
  email_status: EmailStatus | null
  resend_email_id: string | null
  profile_id: string | null
  profile: ProspectProfile | null
  created_at: string
  updated_at: string
}

/** Todos os prospects (pediatras captados), com o uso do perfil vinculado. Exige service role. */
export async function listProspects(supabase: SupabaseClient): Promise<ProspectRow[]> {
  const { data, error } = await supabase.from("prospects").select("*").order("full_name")
  if (error) throw new Error(`[ADMIN] Failed to list prospects: ${error.message}`)
  const rows = (data ?? []) as Omit<ProspectRow, "profile">[]
  return attachProfiles(supabase, rows)
}

/** Preenche `profile` pela view de uso do admin (status da assinatura + consultas). */
export async function attachProfiles<T extends { profile_id: string | null }>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<(T & { profile: ProspectProfile | null })[]> {
  const ids = rows.map((r) => r.profile_id).filter((id): id is string => !!id)
  const profiles = new Map<string, ProspectProfile>()
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("admin_profile_usage")
      .select("profile_id, status, created_at, cases")
      .in("profile_id", ids)
    if (error) throw new Error(`[ADMIN] Failed to load prospect profiles: ${error.message}`)
    for (const p of data ?? []) profiles.set(p.profile_id, { id: p.profile_id, status: p.status, created_at: p.created_at, cases: p.cases })
  }
  return rows.map((r) => ({ ...r, profile: r.profile_id ? (profiles.get(r.profile_id) ?? null) : null }))
}

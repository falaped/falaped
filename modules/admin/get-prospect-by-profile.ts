import type { SupabaseClient } from "@supabase/supabase-js"

export type LinkedProspect = {
  id: string
  city: string | null
  sources: string[]
  invited_at: string | null
  email_status: string | null
  last_contact_at: string | null
  last_channel: string | null
}

/** O prospect que virou esta conta (vínculo por e-mail feito na captação). Exige service role. */
export async function getProspectByProfile(supabase: SupabaseClient, profileId: string): Promise<LinkedProspect | null> {
  const { data, error } = await supabase
    .from("prospects")
    .select("id, city, sources, invited_at, email_status, last_contact_at, last_channel")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`[ADMIN] Failed to load linked prospect: ${error.message}`)
  return data
}

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Telefone vinculado a um perfil, ou `null` quando não há vínculo.
 *
 * Existe porque `cases` amarra a posse por `user_phone`, não por `profile_id`
 * (caso vindo do WhatsApp pode não ter perfil), então toda escrita em caso
 * precisa resolver o telefone antes.
 */
export async function getPhoneByProfileId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("authenticated_users")
    .select("phone")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error)
    throw new Error(`[AUTH_USERS] Failed to resolve phone: ${error.message}`)

  return (data as { phone: string | null } | null)?.phone ?? null
}

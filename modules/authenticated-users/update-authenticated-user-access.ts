import type { SupabaseClient } from "@supabase/supabase-js"

import type { AuthenticatedUserStatus } from "@/lib/account-status"

export type AuthenticatedUserAccessPatch = {
  status?: AuthenticatedUserStatus
  trial_ends_at?: string | null
}

/**
 * Atualiza status e/ou fim do trial da conta do perfil.
 * Exige client de service role: anon e authenticated não têm UPDATE nessas colunas.
 */
export async function updateAuthenticatedUserAccess(
  supabase: SupabaseClient,
  profileId: string,
  patch: AuthenticatedUserAccessPatch
): Promise<void> {
  const { data, error } = await supabase
    .from("authenticated_users")
    .update(patch)
    .eq("profile_id", profileId)
    .select("id")

  if (error)
    throw new Error(
      `[AUTHENTICATED_USERS] Failed to update access: ${error.message}`
    )
  if (!data?.length)
    throw new Error("[AUTHENTICATED_USERS] Conta não encontrada.")
}

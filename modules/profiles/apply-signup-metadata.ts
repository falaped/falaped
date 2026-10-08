import type { SupabaseClient } from "@supabase/supabase-js"

import type { Profile } from "@/modules/profiles/types"

type SignupFields = Pick<Profile, "first_name" | "surname" | "crm">

/**
 * Leva ao perfil o que o cadastro guardou no user_metadata e o trigger
 * handle_new_auth_user não grava: CRM e o nome já separado (o trigger corta
 * "Ana Clara Souza" no primeiro espaço). Roda uma vez: depois de aplicar,
 * limpa as chaves do metadata. Devolve os campos aplicados, ou null se não havia nada.
 * @throws Error("[PROFILES] ...") se a gravação falhar
 */
export async function applySignupMetadata(
  supabase: SupabaseClient,
  profileId: string
): Promise<Partial<SignupFields> | null> {
  const { data } = await supabase.auth.getUser()
  const meta = data.user?.user_metadata ?? {}
  if (!meta.crm && !meta.first_name) return null

  const fields: Partial<SignupFields> = {}
  if (meta.crm) fields.crm = String(meta.crm)
  if (meta.first_name) fields.first_name = String(meta.first_name)
  if (meta.surname) fields.surname = String(meta.surname)

  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", profileId)
  if (error) throw new Error(`[PROFILES] Failed to apply signup metadata: ${error.message}`)

  const { error: clearError } = await supabase.auth.updateUser({
    data: { crm: null, first_name: null, surname: null },
  })
  if (clearError) throw new Error(`[PROFILES] Failed to clear signup metadata: ${clearError.message}`)

  return fields
}

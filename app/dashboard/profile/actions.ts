"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

/**
 * Permanently deletes the current user's account. Cascade trigger removes
 * profile, authenticated_users, cases, case_messages, patients, etc.
 * Requires SUPABASE_SERVICE_ROLE_KEY. Caller should redirect to /auth/login on ok: true.
 */
export async function deleteMyAccountAction(): Promise<DeleteAccountResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Sessão não encontrada." }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      return { ok: false, error: error.message }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao excluir conta."
    return { ok: false, error: message }
  }

  return { ok: true }
}

"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getProfileByAuthUserId } from "@/modules/profiles/get-profile-by-auth-user-id"
import {
  updateAuthenticatedUserStatus,
  type AuthenticatedUserStatus,
} from "@/modules/authenticated-users/update-authenticated-user-status"

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

export type UpdateStatusResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Updates the current user's authenticated_users.status (paid | unpaid | blocked).
 * Resolves profile from session; only updates the row linked to the current user.
 */
export async function updateStatusAction(
  status: AuthenticatedUserStatus
): Promise<UpdateStatusResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sessão não encontrada." }

  const profile = await getProfileByAuthUserId(supabase, user.id)
  if (!profile)
    return { ok: false, error: "Perfil não encontrado." }

  try {
    await updateAuthenticatedUserStatus(supabase, profile.id, status)
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar status."
    return { ok: false, error: message }
  }
}

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

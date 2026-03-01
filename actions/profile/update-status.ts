"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import {
  updateAuthenticatedUserStatus,
  type AuthenticatedUserStatus,
} from "@/modules/authenticated-users/update-authenticated-user-status"

export type UpdateStatusResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Updates the current user's authenticated_users.status (paid | unpaid | blocked).
 */
export async function updateStatusAction(
  status: AuthenticatedUserStatus,
): Promise<UpdateStatusResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) return { ok: false, error: "Sessão não encontrada." }

  try {
    await updateAuthenticatedUserStatus(supabase, profile.id, status)
    revalidatePath("/dashboard/profile")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar status."
    return { ok: false, error: message }
  }
}

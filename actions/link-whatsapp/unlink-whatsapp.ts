"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { clearAuthenticatedUserPhone } from "@/modules/authenticated-users/clear-authenticated-user-phone"

export type UnlinkWhatsAppResult = { ok: true } | { ok: false; error: string }

/**
 * Server Action: clears the phone for the current user's authenticated_users row (unlink WhatsApp).
 */
export async function unlinkWhatsAppAction(): Promise<UnlinkWhatsAppResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) {
    return { ok: false, error: "Sessão não encontrada. Faça login novamente." }
  }

  try {
    await clearAuthenticatedUserPhone(supabase, profile.id)
    revalidatePath("/dashboard/link-whatsapp")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao desvincular."
    return { ok: false, error: message }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getProfileByAuthUserId } from "@/modules/profiles/get-profile-by-auth-user-id"
import { createLinkCode } from "@/modules/phone-link-codes/create-link-code"
import { clearAuthenticatedUserPhone } from "@/modules/authenticated-users/clear-authenticated-user-phone"

export type CreateLinkCodeActionResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; error: string }

export type UnlinkWhatsAppResult = { ok: true } | { ok: false; error: string }

/**
 * Server Action: generates a 6-digit link code for the authenticated user's profile.
 * Call from "Vincular WhatsApp" UI; user then sends the code in WhatsApp to the Falaped bot.
 */
export async function createWhatsAppLinkCodeAction(): Promise<CreateLinkCodeActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Sessão não encontrada. Faça login novamente." }
  }

  const profile = await getProfileByAuthUserId(supabase, user.id)
  if (!profile) {
    return { ok: false, error: "Perfil não encontrado." }
  }

  try {
    const { code, expiresAt } = await createLinkCode(supabase, profile.id)
    return { ok: true, code, expiresAt }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao gerar código."
    return { ok: false, error: message }
  }
}

/**
 * Server Action: clears the phone for the current user's authenticated_users row (unlink WhatsApp).
 */
export async function unlinkWhatsAppAction(): Promise<UnlinkWhatsAppResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Sessão não encontrada. Faça login novamente." }
  }

  const profile = await getProfileByAuthUserId(supabase, user.id)
  if (!profile) {
    return { ok: false, error: "Perfil não encontrado." }
  }

  try {
    await clearAuthenticatedUserPhone(supabase, profile.id)
    revalidatePath("/dashboard/vinculacao-whatsapp")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao desvincular."
    return { ok: false, error: message }
  }
}

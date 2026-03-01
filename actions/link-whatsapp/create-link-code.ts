"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createLinkCode } from "@/modules/phone-link-codes/create-link-code"

export type CreateLinkCodeActionResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; error: string }

/**
 * Server Action: generates a 6-digit link code for the authenticated user's profile.
 * Call from Link WhatsApp UI; user then sends the code in WhatsApp to the Falaped bot.
 */
export async function createWhatsAppLinkCodeAction(): Promise<CreateLinkCodeActionResult> {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) {
    return { ok: false, error: "Sessão não encontrada. Faça login novamente." }
  }

  try {
    const { code, expiresAt } = await createLinkCode(supabase, profile.id)
    return { ok: true, code, expiresAt }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao gerar código."
    return { ok: false, error: message }
  }
}

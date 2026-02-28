import type { SupabaseClient } from "@supabase/supabase-js"

const CODE_LENGTH = 6
const EXPIRES_MINUTES = 5

export type CreateLinkCodeResult = {
  code: string
  expiresAt: string
}

/**
 * Generates a cryptographically random 6-digit code and inserts a row in phone_link_codes.
 * Used by the "Vincular WhatsApp" flow: user receives code in dashboard and sends it in WhatsApp; bot validates and links phone to profile_id.
 */
export async function createLinkCode(
  supabase: SupabaseClient,
  profileId: string
): Promise<CreateLinkCodeResult> {
  const code = generateSixDigitCode()
  const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000).toISOString()

  const { error } = await supabase.from("phone_link_codes").insert({
    code,
    profile_id: profileId,
    expires_at: expiresAt,
  })

  if (error) throw new Error(`[PHONE_LINK_CODES] Failed to create code: ${error.message}`)

  return { code, expiresAt }
}

function generateSixDigitCode(): string {
  const array = new Uint8Array(CODE_LENGTH)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < CODE_LENGTH; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, (b) => (b % 10).toString()).join("")
}

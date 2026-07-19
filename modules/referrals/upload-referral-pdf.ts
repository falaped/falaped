import type { SupabaseClient } from "@supabase/supabase-js"
import { REFERRALS_BUCKET } from "@/lib/constants"

/**
 * Uploads a referral PDF to storage.
 * Path: {profileId}/{referralId}.pdf — only the profile owner can access (RLS).
 *
 * @returns The storage path to save in referrals.pdf_storage_path
 */
export async function uploadReferralPdf(
  supabase: SupabaseClient,
  profileId: string,
  referralId: string,
  buffer: Buffer,
): Promise<string> {
  const path = `${profileId}/${referralId}.pdf`

  const { error } = await supabase.storage
    .from(REFERRALS_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    throw new Error(`[REFERRALS] Falha no upload do PDF: ${error.message}`)
  }

  return path
}

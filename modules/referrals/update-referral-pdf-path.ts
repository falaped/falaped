import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Updates the pdf_storage_path for a referral after upload.
 * Scoped by profile_id as defense-in-depth (D-15).
 */
export async function updateReferralPdfPath(
  supabase: SupabaseClient,
  referralId: string,
  profileId: string,
  pdfStoragePath: string,
): Promise<void> {
  const { error } = await supabase
    .from("referrals")
    .update({ pdf_storage_path: pdfStoragePath })
    .eq("id", referralId)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(
      `[REFERRALS] update pdf_storage_path failed: ${error.message}`,
    )
  }
}

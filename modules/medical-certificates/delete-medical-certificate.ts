import type { SupabaseClient } from "@supabase/supabase-js"
import { MEDICAL_CERTIFICATES_BUCKET } from "@/lib/constants"

/**
 * Deletes a medical certificate by id, scoped to the owning profile (IDOR fix: SEC-01).
 * Uses the user-scoped Supabase client throughout — no admin client.
 * DB row is deleted first; storage PDF removal is best-effort (orphan logged, not thrown).
 */
export async function deleteMedicalCertificate(
  supabase: SupabaseClient, // user-scoped client; storage RLS handles bucket access
  certificateId: string,
  profileId: string, // ownership anchor for IDOR fix
  pdfStoragePath: string | null,
): Promise<void> {
  // 1. Delete DB row first — scoped by ownership (IDOR fix)
  const { error } = await supabase
    .from("medical_certificates")
    .delete()
    .eq("id", certificateId)
    .eq("profile_id", profileId) // ownership filter — SEC-01

  if (error) {
    throw new Error(
      `[MEDICAL_CERTIFICATES] Failed to delete certificate: ${error.message}`,
    )
  }

  // 2. Remove PDF from storage (user client; storage RLS "Medical Certificates delete own" applies)
  if (pdfStoragePath?.trim()) {
    const { error: storageError } = await supabase.storage
      .from(MEDICAL_CERTIFICATES_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      // Log but do NOT throw — DB row is gone; orphan PDF is preferable to IDOR
      console.error(
        `[MEDICAL_CERTIFICATES] Orphan PDF not removed: ${storageError.message}`,
      )
    }
  }
}

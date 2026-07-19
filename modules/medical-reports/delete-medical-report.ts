import type { SupabaseClient } from "@supabase/supabase-js"
import { MEDICAL_REPORTS_BUCKET } from "@/lib/constants"

/**
 * Deletes a medical report by id, scoped to the owning profile (IDOR fix: D-15).
 * Uses the user-scoped Supabase client throughout — no admin client.
 * DB row is deleted first; storage PDF removal is best-effort (orphan logged, not thrown).
 */
export async function deleteMedicalReport(
  supabase: SupabaseClient, // user-scoped client; storage RLS handles bucket access
  medicalReportId: string,
  profileId: string, // ownership anchor for IDOR fix
  pdfStoragePath: string | null,
): Promise<void> {
  // 1. Delete DB row first — scoped by ownership (IDOR fix)
  const { error } = await supabase
    .from("medical_reports")
    .delete()
    .eq("id", medicalReportId)
    .eq("profile_id", profileId) // ownership filter — D-15, NEVER id-only

  if (error) {
    throw new Error(
      `[MEDICAL_REPORTS] Failed to delete medical report: ${error.message}`,
    )
  }

  // 2. Remove PDF from storage (user client; storage RLS "Medical reports delete own" applies)
  if (pdfStoragePath?.trim()) {
    const { error: storageError } = await supabase.storage
      .from(MEDICAL_REPORTS_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      // Log but do NOT throw — DB row is gone; orphan PDF is preferable to IDOR
      console.error(
        `[MEDICAL_REPORTS] Orphan PDF not removed: ${storageError.message}`,
      )
    }
  }
}

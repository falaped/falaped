import type { SupabaseClient } from "@supabase/supabase-js"
import { PRESCRIPTIONS_BUCKET } from "@/lib/constants"

/**
 * Deletes a prescription by id, scoped to the owning profile (IDOR fix: SEC-01).
 * Uses the user-scoped Supabase client throughout — no admin client.
 * DB row is deleted first; storage PDF removal is best-effort (orphan logged, not thrown).
 */
export async function deletePrescription(
  supabase: SupabaseClient, // user-scoped client; storage RLS handles bucket access
  prescriptionId: string,
  profileId: string, // ownership anchor for IDOR fix
  pdfStoragePath: string | null,
): Promise<void> {
  // 1. Delete DB row first — scoped by ownership (IDOR fix)
  const { error } = await supabase
    .from("prescriptions")
    .delete()
    .eq("id", prescriptionId)
    .eq("profile_id", profileId) // ownership filter — SEC-01

  if (error) {
    throw new Error(
      `[PRESCRIPTIONS] Failed to delete prescription: ${error.message}`,
    )
  }

  // 2. Remove PDF from storage (user client; storage RLS "Prescriptions delete own" applies)
  if (pdfStoragePath?.trim()) {
    const { error: storageError } = await supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .remove([pdfStoragePath])

    if (storageError) {
      // Log but do NOT throw — DB row is gone; orphan PDF is preferable to IDOR
      console.error(
        `[PRESCRIPTIONS] Orphan PDF not removed: ${storageError.message}`,
      )
    }
  }
}

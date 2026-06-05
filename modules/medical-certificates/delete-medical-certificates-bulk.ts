import type { SupabaseClient } from "@supabase/supabase-js"
import { MEDICAL_CERTIFICATES_BUCKET } from "@/lib/constants"

/**
 * Deletes multiple medical certificates in a single batched DB operation, ownership-scoped (SEC-01).
 * Issues exactly one DB delete and one storage remove call regardless of how many ids are passed (SEC-04).
 * Unauthorized ids are silently skipped (no-op rows from the ownership filter).
 */
export async function deleteMedicalCertificatesBulk(
  supabase: SupabaseClient,
  ids: string[],
  profileId: string,
  pdfStoragePaths: (string | null)[],
): Promise<{ deletedCount: number }> {
  if (ids.length === 0) return { deletedCount: 0 }

  // Single atomic DB delete — ownership-scoped, silently skips unauthorized IDs
  const { error, count } = await supabase
    .from("medical_certificates")
    .delete({ count: "exact" })
    .in("id", ids)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(
      `[MEDICAL_CERTIFICATES] Bulk delete failed: ${error.message}`,
    )
  }

  // Single storage batch remove — runs only after DB is committed
  const paths = pdfStoragePaths.filter((p): p is string => !!p?.trim())
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(MEDICAL_CERTIFICATES_BUCKET)
      .remove(paths)

    if (storageError) {
      console.error(
        `[MEDICAL_CERTIFICATES] Orphan PDFs not removed after bulk delete: ${storageError.message}`,
      )
    }
  }

  return { deletedCount: count ?? ids.length }
}

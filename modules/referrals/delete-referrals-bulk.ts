import type { SupabaseClient } from "@supabase/supabase-js"
import { REFERRALS_BUCKET } from "@/lib/constants"

/**
 * Deletes multiple referrals in a single batched DB operation, ownership-scoped (D-15).
 * Issues exactly one DB delete and one storage remove call regardless of how many ids are passed.
 * Unauthorized ids are silently skipped (no-op rows from the ownership filter).
 */
export async function deleteReferralsBulk(
  supabase: SupabaseClient,
  ids: string[],
  profileId: string,
  pdfStoragePaths: (string | null)[],
): Promise<{ deletedCount: number }> {
  if (ids.length === 0) return { deletedCount: 0 }

  // Single atomic DB delete — ownership-scoped, silently skips unauthorized IDs
  const { error, count } = await supabase
    .from("referrals")
    .delete({ count: "exact" })
    .in("id", ids)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[REFERRALS] Bulk delete failed: ${error.message}`)
  }

  // Single storage batch remove — runs only after DB is committed
  const paths = pdfStoragePaths.filter((p): p is string => !!p?.trim())
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(REFERRALS_BUCKET)
      .remove(paths)

    if (storageError) {
      console.error(
        `[REFERRALS] Orphan PDFs not removed after bulk delete: ${storageError.message}`,
      )
    }
  }

  return { deletedCount: count ?? ids.length }
}

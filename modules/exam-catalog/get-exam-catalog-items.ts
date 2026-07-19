import type { SupabaseClient } from "@supabase/supabase-js"
import type { ExamCatalogItem } from "./types"

/**
 * Returns the searchable exam catalog items for a profile (D-01), ordered by name.
 * Per-profile reference data — scoped by profile_id.
 */
export async function getExamCatalogItems(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ExamCatalogItem[]> {
  const { data, error } = await supabase
    .from("exam_catalog_items")
    .select("id, name")
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`[EXAM_CATALOG] Failed to list items: ${error.message}`)
  }

  return (data ?? []) as ExamCatalogItem[]
}

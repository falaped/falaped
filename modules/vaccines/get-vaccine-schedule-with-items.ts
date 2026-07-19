import type { SupabaseClient } from "@supabase/supabase-js"
import type { VaccineScheduleWithItems, VaccineSource } from "./types"

/**
 * Fetches a single reference vaccine calendar (by source) joined with its
 * items, ordered by `sort_order` ascending. Returns `null` when the dataset
 * has not been seeded yet.
 *
 * DIVERGÊNCIA DELIBERADA (D-07): NÃO há `.eq("profile_id", ...)` — este é dado
 * de referência GLOBAL, idêntico para todos os médicos. NÃO adicione um filtro
 * por dono; a ausência é intencional (ver RLS global-read do plano 05-01).
 */
export async function getVaccineScheduleWithItems(
  supabase: SupabaseClient,
  source: VaccineSource,
): Promise<VaccineScheduleWithItems | null> {
  const { data, error } = await supabase
    .from("vaccine_schedules")
    .select(
      "id, source, axis, version, effective_date, notes, vaccine_schedule_items(id, vaccine, dose, age_months, age_months_max, week_min, week_max, age_label, sort_order, notes)",
    )
    // NOTE: intentionally NO .eq("profile_id", ...) — global reference data (D-07).
    .eq("source", source)
    .order("sort_order", {
      referencedTable: "vaccine_schedule_items",
      ascending: true,
    })
    .maybeSingle()

  if (error) {
    throw new Error(
      `[VACCINES] Failed to fetch schedule ${source}: ${error.message}`,
    )
  }

  return (data as VaccineScheduleWithItems | null) ?? null
}

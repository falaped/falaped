import type { SupabaseClient } from "@supabase/supabase-js"
import type { ProcedureCatalogItem } from "./types"

/** Só o que a UI e o diálogo de encerramento consomem. */
export type ProcedureCatalogItemOption = Pick<
  ProcedureCatalogItem,
  "id" | "name" | "price_cents"
>

/**
 * Devolve o catálogo de procedimentos de um perfil (D-04), ordenado por nome.
 * Dado de referência por perfil — escopado por profile_id.
 */
export async function listProcedureCatalogItems(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ProcedureCatalogItemOption[]> {
  const { data, error } = await supabase
    .from("procedure_catalog_items")
    .select("id, name, price_cents")
    .eq("profile_id", profileId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`[PROCEDURE_CATALOG] Failed to list items: ${error.message}`)
  }

  return (data ?? []) as ProcedureCatalogItemOption[]
}

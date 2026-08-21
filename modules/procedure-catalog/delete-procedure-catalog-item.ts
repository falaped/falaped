import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Exclui um item do catálogo, SOMENTE se ele pertence ao profile_id informado.
 * O duplo filtro (id E profile_id) é o backstop de posse contra IDOR (T-10-16):
 * NUNCA `.delete().eq("id")` sozinho — isso deixaria um médico apagar o catálogo
 * de outro médico só com o UUID. A RLS owner-scoped é a segunda camada, e
 * `delete-procedure-catalog-item.spec.ts` afirma os dois filtros.
 *
 * Sem efeito colateral em faturamento: cada lançamento guardou nome e centavos por
 * snapshot (D-05), então apagar do catálogo não apaga histórico.
 */
export async function deleteProcedureCatalogItem(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("procedure_catalog_items")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[PROCEDURE_CATALOG] Failed to delete item: ${error.message}`)
  }
}

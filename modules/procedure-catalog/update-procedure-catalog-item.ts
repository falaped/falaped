import type { SupabaseClient } from "@supabase/supabase-js"

export type UpdateProcedureCatalogItemInput = {
  name: string
  /** Centavos inteiros. Zero é válido (procedimento gratuito). */
  priceCents: number
}

/**
 * Atualiza um item do catálogo, SOMENTE se ele pertence ao profile_id informado.
 * O duplo filtro (id E profile_id) é o backstop de posse contra IDOR (T-10-16):
 * NUNCA `.update().eq("id")` sozinho — isso deixaria um médico reescrever o preço
 * do catálogo de outro médico só com o UUID. A RLS owner-scoped é a segunda camada.
 *
 * Reajustar o preço aqui NÃO reescreve faturamento: o lançamento copiou nome e
 * centavos por snapshot (D-05).
 */
export async function updateProcedureCatalogItem(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
  { name, priceCents }: UpdateProcedureCatalogItemInput,
): Promise<void> {
  const { error } = await supabase
    .from("procedure_catalog_items")
    .update({ name, price_cents: priceCents })
    .eq("id", id)
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(`[PROCEDURE_CATALOG] Failed to update item: ${error.message}`)
  }
}

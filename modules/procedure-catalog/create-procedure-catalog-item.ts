import type { SupabaseClient } from "@supabase/supabase-js"

export type CreateProcedureCatalogItemInput = {
  name: string
  /** Centavos inteiros. Zero é válido (procedimento gratuito). */
  priceCents: number
}

/**
 * Cria um item do catálogo de procedimentos. O `profile_id` é estampado a partir do
 * argumento — que vem da sessão, nunca do payload do cliente.
 */
export async function createProcedureCatalogItem(
  supabase: SupabaseClient,
  profileId: string,
  { name, priceCents }: CreateProcedureCatalogItemInput,
): Promise<string> {
  const { data, error } = await supabase
    .from("procedure_catalog_items")
    .insert({ profile_id: profileId, name, price_cents: priceCents })
    .select("id")
    .single()

  if (error) {
    throw new Error(`[PROCEDURE_CATALOG] Failed to create item: ${error.message}`)
  }

  return data.id as string
}

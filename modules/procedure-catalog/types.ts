export type ProcedureCatalogItem = {
  id: string
  profile_id: string
  name: string
  /** Preço em centavos inteiros (D-04/D-14). Zero é válido: procedimento gratuito. */
  price_cents: number
  created_at: string
  updated_at: string
}

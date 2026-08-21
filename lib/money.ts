/**
 * Converte um valor em reais digitado (ou colado) pelo médico em centavos inteiros.
 *
 * A ordem das operações é o que faz um "colar" real funcionar:
 * 1. `trim`;
 * 2. remove tudo fora de `[0-9.,-]` — isso mata o prefixo de moeda, o espaço comum
 *    e o espaço não-separável que vem de `Intl`/planilha;
 * 3. se há vírgula, ela é o separador decimal e os pontos são de milhar;
 *    sem vírgula, o ponto é decimal (`1500.50`), exceto no padrão brasileiro puro
 *    de milhar (`1.500`, `12.345.678`), onde é separador;
 * 4. `Math.round(n * 100)` porque o produto em ponto flutuante erra
 *    (`150.05 * 100 === 15005.000000000002`).
 *
 * Devolve centavos inteiros, ou `null` quando o texto não é um valor válido não-negativo.
 * Quem chama decide a mensagem de erro — este helper não conhece PT-BR.
 */
export function parseBrlToCents(value: string): number | null {
  let cleaned = value.trim().replace(/[^0-9.,-]/g, "")
  if (cleaned === "") return null

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "")
  }

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return Math.round(parsed * 100)
}

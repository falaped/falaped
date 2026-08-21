/** Instância única em escopo de módulo — construir um `Intl.NumberFormat` por chamada é caro. */
const DECIMAL_PT_BR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Converte um valor em reais digitado (ou colado) pelo médico em centavos inteiros.
 *
 * A ordem das operações é o que faz um "colar" real funcionar:
 * 1. remove só o RUÍDO conhecido de um colar: espaços (inclusive o não-separável que
 *    vem de `Intl`/planilha) e o prefixo `R$`;
 * 2. FALHA FECHADA em qualquer resíduo fora de `[0-9.,-]`. Isto é uma lista branca de
 *    ruído, não de tudo: apagar o desconhecido transformava `1e3` em R$ 13,00 e
 *    `1,5e3` em R$ 1,53 — um valor DIFERENTE, aceito sem erro nenhum;
 * 3. se há vírgula, ela é o separador decimal e os pontos são de milhar;
 *    sem vírgula, o ponto é decimal (`1500.50`), exceto no padrão brasileiro puro
 *    de milhar (`1.500`, `12.345.678`), onde é separador;
 * 4. mais de duas casas decimais é REPROVADO, nunca arredondado: `2,999` virando
 *    R$ 3,00 em silêncio é errado, e `0,004` virando zero era pior ainda — a linha
 *    era descartada pelo filtro de valor zero e o médico lia "Caso encerrado sem
 *    lançamento." como se tivesse sido de propósito;
 * 5. `Math.round(n * 100)` porque o produto em ponto flutuante erra
 *    (`150.05 * 100 === 15005.000000000002`).
 *
 * Devolve centavos inteiros, ou `null` quando o texto não é um valor válido não-negativo.
 * Quem chama decide a mensagem de erro — este helper não conhece PT-BR.
 */
export function parseBrlToCents(value: string): number | null {
  let cleaned = value.replace(/\s|R\$/g, "")
  if (cleaned === "" || /[^0-9.,-]/.test(cleaned)) return null

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "")
  }

  // Aqui o separador decimal já é ponto: mais de duas casas é erro, não arredondamento.
  if (/\.\d{3,}$/.test(cleaned)) return null

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return Math.round(parsed * 100)
}

/**
 * Centavos inteiros → o texto que vai DENTRO de um input de moeda: decimal PT-BR sem
 * prefixo (`25000` → `"250,00"`). O `R$` vive no rótulo do campo, nunca no valor — um
 * prefixo dentro do valor teria de ser parseado de volta a cada tecla.
 *
 * `null` (valor não configurado) devolve string vazia: o campo abre só com o placeholder,
 * nunca com um zero que seria submetido por inércia.
 */
export function formatCentsToInputValue(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ""
  return DECIMAL_PT_BR.format(cents / 100)
}

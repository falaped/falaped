import { z } from "zod"
import { parseBrlToCents } from "@/lib/money"

/**
 * Schema do catálogo de procedimentos do Perfil (EARN-01, D-04). A validação acontece no
 * boundary (actions) via safeParse, com mensagens PT-BR do contrato de moeda do UI-SPEC.
 *
 * `profile_id` é estampado server-side a partir da sessão e NUNCA vem do cliente.
 * O preço sai daqui em centavos inteiros; nenhum decimal em reais é persistido.
 */

/** Teto abaixo do limite de `integer` do Postgres (2147483647 centavos). */
const MAX_PRICE_CENTS = 2_000_000_000

/**
 * Preço do procedimento: string do form em reais → centavos inteiros.
 *
 * Assimetria deliberada em relação ao valor de um LANÇAMENTO: aqui o zero É aceito
 * (um procedimento gratuito é catalogável — é a mesma regra da constraint
 * `procedure_catalog_items_price_non_negative`) e só o negativo é rejeitado.
 */
const priceCentsSchema = z
  .string({ message: "Informe o valor." })
  .transform((raw, ctx) => {
    const trimmed = raw.trim()
    if (trimmed === "") {
      ctx.addIssue({ code: "custom", message: "Informe o valor." })
      return z.NEVER
    }
    // `parseBrlToCents` devolve null tanto para negativo quanto para inparseável;
    // o sinal no texto é o que separa as duas mensagens.
    if (trimmed.includes("-")) {
      ctx.addIssue({ code: "custom", message: "O preço não pode ser negativo." })
      return z.NEVER
    }
    const cents = parseBrlToCents(trimmed)
    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: "Valor inválido. Use apenas números, ex.: 250,00.",
      })
      return z.NEVER
    }
    if (cents > MAX_PRICE_CENTS) {
      ctx.addIssue({
        code: "custom",
        message: "Valor muito alto. Confira o que foi digitado.",
      })
      return z.NEVER
    }
    return cents
  })

export const procedureCatalogItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do procedimento.")
    .max(120, "Use no máximo 120 caracteres."),
  price: priceCentsSchema,
})

/** Valores parseados (preço já em centavos inteiros). */
export type ProcedureCatalogItemFormData = z.infer<
  typeof procedureCatalogItemSchema
>

/** Valores crus do form (o preço sobe como o texto que o médico digitou). */
export type ProcedureCatalogItemFormValues = z.input<
  typeof procedureCatalogItemSchema
>

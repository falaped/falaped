import { z } from "zod"
import { parseBrazilianDateStringToIso } from "@/lib/brazilian-date-form"
import { parseBrlToCents } from "@/lib/money"

/**
 * Schemas de validação do livro-caixa de ganhos (EARN-01..05, Fase 10). A validação
 * acontece no boundary (actions) via safeParse, com mensagens PT-BR inline — as mesmas
 * strings travadas no contrato de moeda do UI-SPEC.
 *
 * `profile_id` é estampado server-side a partir da sessão e NUNCA vem do cliente.
 * Todo valor sai daqui em centavos inteiros; nenhum decimal em reais é persistido.
 */

/** Os 4 valores do pg enum public.payment_method, na ordem declarada no banco. */
export const PAYMENT_METHOD_VALUES = ["pix", "cash", "card", "insurance"] as const

export const paymentMethodSchema = z.enum(PAYMENT_METHOD_VALUES, {
  message: "Forma de pagamento inválida.",
})

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>

/** Rótulos PT-BR para a UI. Os valores gravados no banco ficam em inglês. */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethodInput, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
  insurance: "Convênio",
}

/** Teto abaixo do limite de `integer` do Postgres (2147483647 centavos). */
const MAX_AMOUNT_CENTS = 2_000_000_000

/**
 * Valor em reais digitado pelo médico → centavos inteiros. As quatro mensagens são
 * as do contrato de moeda; `parseBrlToCents` faz o parse e este schema decide o erro.
 */
const amountCentsSchema = z
  .string({ message: "Informe o valor." })
  .transform((raw, ctx) => {
    if (raw.trim() === "") {
      ctx.addIssue({ code: "custom", message: "Informe o valor." })
      return z.NEVER
    }
    const cents = parseBrlToCents(raw)
    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: "Valor inválido. Use apenas números, ex.: 250,00.",
      })
      return z.NEVER
    }
    if (cents <= 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "O valor deve ser maior que zero. Para cortesia, encerre o caso sem lançar.",
      })
      return z.NEVER
    }
    if (cents > MAX_AMOUNT_CENTS) {
      ctx.addIssue({ code: "custom", message: "Valor muito alto. Confira o que foi digitado." })
      return z.NEVER
    }
    return cents
  })

/**
 * Data de recebimento: o form envia o texto mascarado dd/mm/aaaa e o schema devolve
 * ISO yyyy-mm-dd para a coluna `date`. O parse é o helper já testado do repo — nunca
 * uma regex própria (`31/02` tem de reprovar).
 */
const receivedOnSchema = z
  .string({ message: "Informe a data no formato dd/mm/aaaa." })
  .transform((raw, ctx) => {
    const iso = parseBrazilianDateStringToIso(raw)
    if (!iso) {
      ctx.addIssue({ code: "custom", message: "Informe a data no formato dd/mm/aaaa." })
      return z.NEVER
    }
    return iso
  })

/**
 * Lançamento avulso (EARN-02): dinheiro que não veio de um caso. Os quatro campos são
 * obrigatórios e o avulso NUNCA carrega `case_id` (D-13).
 */
export const standaloneFinancialEntrySchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Descreva o lançamento.")
    .max(500, "Descrição muito longa."),
  amount: amountCentsSchema,
  received_on: receivedOnSchema,
  payment_method: z.enum(PAYMENT_METHOD_VALUES, {
    message: "Selecione a forma de pagamento.",
  }),
})

export type StandaloneFinancialEntryFormData = z.infer<
  typeof standaloneFinancialEntrySchema
>

export type StandaloneFinancialEntryFormValues = z.input<
  typeof standaloneFinancialEntrySchema
>

/**
 * Valor de uma linha do encerramento de caso → centavos inteiros, com piso NÃO-NEGATIVO.
 *
 * ⚠️ Aqui o zero é VÁLIDO e este schema NÃO reusa a regra de valor-positivo do avulso.
 * O catálogo aceita `price_cents = 0` de propósito (um procedimento gratuito é
 * catalogável), então uma linha de procedimento pode legitimamente chegar valendo zero:
 * o médico marcou um procedimento que ele mesmo cadastrou como gratuito, e ele realmente
 * foi realizado. Herdar o `> 0` do avulso mostraria a mensagem sobre cortesia por causa
 * de um procedimento cadastrado de graça — mensagem errada, para um ato correto. É a
 * ACTION que descarta as linhas de valor zero antes do insert, reconciliando com a
 * constraint `amount_cents > 0` da tabela.
 *
 * No avulso o valor é digitado à mão, sem fonte no catálogo, então lá zero é de fato erro.
 */
function parseNonNegativeAmount(
  raw: string,
  ctx: { addIssue: (issue: { code: "custom"; message: string }) => void },
): number | typeof z.NEVER {
  // O '-' é checado ANTES do helper: `parseBrlToCents` devolve null tanto para
  // negativo quanto para inparseável, então só o texto separa as duas mensagens.
  if (raw.includes("-")) {
    ctx.addIssue({ code: "custom", message: "O valor não pode ser negativo." })
    return z.NEVER
  }
  const cents = parseBrlToCents(raw)
  if (cents === null) {
    ctx.addIssue({
      code: "custom",
      message: "Valor inválido. Use apenas números, ex.: 250,00.",
    })
    return z.NEVER
  }
  if (cents > MAX_AMOUNT_CENTS) {
    ctx.addIssue({ code: "custom", message: "Valor muito alto. Confira o que foi digitado." })
    return z.NEVER
  }
  return cents
}

const nonNegativeAmountCentsSchema = z
  .string({ message: "Informe o valor." })
  .transform((raw, ctx) => {
    if (raw.trim() === "") {
      ctx.addIssue({ code: "custom", message: "Informe o valor." })
      return z.NEVER
    }
    return parseNonNegativeAmount(raw, ctx)
  })

/** Valor da consulta: ausente ou vazio é o caso de CORTESIA (D-09), não erro. */
const optionalAmountCentsSchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (raw === undefined || raw.trim() === "") return undefined
    return parseNonNegativeAmount(raw, ctx)
  })

/**
 * Lançamentos gerados ao ENCERRAR um caso (EARN-01, D-07): 1 linha da consulta +
 * 1 por procedimento marcado, todas com a mesma data e a mesma forma de pagamento.
 *
 * `procedures` vazio E `consultationAmount` ausente ao mesmo tempo é VÁLIDO — é a
 * cortesia (D-09), e a action devolve sucesso sem tocar no banco.
 *
 * O cliente manda só o id e o valor de cada procedimento; o RÓTULO (`description`) é
 * lido do catálogo NO SERVIDOR e nunca aceito daqui (T-10-25).
 */
export const caseFinancialEntriesSchema = z.object({
  caseId: z.string().uuid("Caso inválido para este perfil."),
  receivedOn: receivedOnSchema,
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES, {
    message: "Selecione a forma de pagamento.",
  }),
  consultationAmount: optionalAmountCentsSchema,
  procedures: z.array(
    z.object({
      catalogItemId: z.string().uuid("Procedimento inválido."),
      amount: nonNegativeAmountCentsSchema,
    }),
  ),
})

export type CaseFinancialEntriesFormData = z.infer<typeof caseFinancialEntriesSchema>

export type CaseFinancialEntriesFormValues = z.input<typeof caseFinancialEntriesSchema>

import { z } from "zod"
import { parseBrlToCents } from "@/lib/money"

/** Teto abaixo do limite de `integer` do Postgres (2147483647 centavos). */
const MAX_PRICE_CENTS = 2_000_000_000

/**
 * Valor da consulta (EARN-01): campo de FORMULÁRIO em reais → centavos inteiros.
 *
 * String vazia vira `undefined`, que o action grava como NULO — nunca zero, porque um
 * zero pré-preenchido é submetido por inércia. Zero digitado É aceito (é um preço, não
 * um lançamento) e só o negativo é rejeitado. As mensagens são as do contrato de moeda.
 */
const consultationPriceCentsSchema = z.string().transform((raw, ctx) => {
  const trimmed = raw.trim()
  if (trimmed === "") return undefined
  // `parseBrlToCents` devolve null tanto para negativo quanto para inparseável; o sinal
  // no texto é o que separa as duas mensagens.
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
    ctx.addIssue({ code: "custom", message: "Valor muito alto. Confira o que foi digitado." })
    return z.NEVER
  }
  return cents
})

/** Form values: all string (empty string when not set). */
const updateProfileFormSchema = z.object({
  first_name: z
    .string()
    .max(32, "Use no máximo 32 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  surname: z
    .string()
    .max(32, "Use no máximo 32 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  email: z
    .string()
    .transform((v) => (v.trim() === "" ? undefined : v.trim()))
    .pipe(z.string().email("E-mail inválido").optional()),
  crm: z
    .string()
    .max(20, "Use no máximo 20 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  rqe: z
    .string()
    .max(20, "Use no máximo 20 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  social_media_handle: z
    .string()
    .max(100, "Use no máximo 100 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  website: z
    .string()
    .max(500, "Use no máximo 500 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  report_template_id: z.preprocess(
    (v) => (v === undefined || v === null ? "" : v),
    z
      .string()
      .transform((v) => (v.trim() === "" ? undefined : v.trim()))
      .pipe(z.string().uuid("Selecione um template válido").optional())
  ),
  default_location_state: z
    .string()
    .max(100, "Use no máximo 100 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  default_location_city: z
    .string()
    .max(100, "Use no máximo 100 caracteres")
    .transform((v) => (v.trim() === "" ? undefined : v.trim())),
  consultation_price_cents: consultationPriceCentsSchema,
})

export const updateProfileSchema = updateProfileFormSchema

/** Form field values (strings; empty string when not set). */
export type UpdateProfileFormValues = z.input<typeof updateProfileSchema>

/** Parsed payload for update (after transform). */
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

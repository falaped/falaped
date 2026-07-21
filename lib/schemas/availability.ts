import { z } from "zod"

/**
 * Schemas de validação da disponibilidade (AGENDA-01/AGENDA-03/AGENDA-05, Fase 6).
 * Validação no boundary (actions) espelhando os CHECK constraints do DB: minutos
 * múltiplos de 30, teto de 1440 (24:00, WR-03), fim maior que início, nullability
 * coerente do override, data ISO estrita (WR-02) e slot condicional para aditivos
 * (D-20). Mensagens PT-BR inline.
 */

const multipleOf30 = (value: number) => value % 30 === 0

// Teto de minutos WR-03: 1440 = 24:00 (fim do dia alcançável, coerente com WR-04).
const MINUTE_CEILING = 1440

// WR-02: data ISO estrita `YYYY-MM-DD` + reconstrução da data e comparação de
// ano/mês/dia (rejeita rollovers como 2026-02-30 que o JS Date normalizaria).
// Espelha `localMidnightFromIso` de lib/compute-pediatric-age.ts.
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function isValidIsoDate(value: string): boolean {
  const m = ISO_DATE_ONLY.exec(value.trim())
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (Number.isNaN(d.getTime())) return false
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  )
}

/** Uma faixa de disponibilidade semanal (uma linha de availability_rules). */
export const availabilityRuleSchema = z
  .object({
    weekday: z
      .number()
      .int("O dia da semana deve ser um número inteiro.")
      .min(0, "O dia da semana deve estar entre 0 (domingo) e 6 (sábado).")
      .max(6, "O dia da semana deve estar entre 0 (domingo) e 6 (sábado)."),
    start_minute: z
      .number()
      .int("O horário inicial deve ser um número inteiro de minutos.")
      .min(0, "O horário inicial não pode ser negativo.")
      .max(MINUTE_CEILING, "O horário não pode passar de 24:00 (1440 min).")
      .refine(multipleOf30, "A faixa deve começar em múltiplos de 30 minutos."),
    end_minute: z
      .number()
      .int("O horário final deve ser um número inteiro de minutos.")
      .max(MINUTE_CEILING, "O horário não pode passar de 24:00 (1440 min).")
      .refine(multipleOf30, "A faixa deve terminar em múltiplos de 30 minutos."),
    slot_minutes: z
      .number()
      .int("A duração do slot deve ser um número inteiro de minutos.")
      .positive("A duração do slot deve ser maior que zero."),
  })
  .refine((rule) => rule.end_minute > rule.start_minute, {
    message: "O horário final deve ser maior que o inicial.",
    path: ["end_minute"],
  })

/** Grade semanal inteira do médico (substitui todas as faixas ao salvar). */
export const saveAvailabilityRulesSchema = z.object({
  rules: z.array(availabilityRuleSchema),
})

/**
 * Criação de um override por data (D-20, modelo híbrido v2). Substitui o schema
 * v1 só-subtrativo. `override_type`:
 * - `"subtract"` (folga): faixa parcial `[start,end)` OU dia inteiro (ambos null).
 *   `slot_minutes` ignorado/null.
 * - `"add"` (disponibilidade extra, AGENDA-05): exige faixa + `slot_minutes > 0`.
 */
export const createAvailabilityOverrideSchema = z
  .object({
    override_type: z.enum(["add", "subtract"], {
      message: "O tipo do override deve ser 'add' ou 'subtract'.",
    }),
    exception_date: z
      .string()
      .refine(isValidIsoDate, "Data inválida (use AAAA-MM-DD)."),
    start_minute: z
      .number()
      .int("O horário inicial deve ser um número inteiro de minutos.")
      .min(0, "O horário inicial não pode ser negativo.")
      .max(MINUTE_CEILING, "O horário não pode passar de 24:00 (1440 min).")
      .refine(multipleOf30, "A faixa deve começar em múltiplos de 30 minutos.")
      .nullable(),
    end_minute: z
      .number()
      .int("O horário final deve ser um número inteiro de minutos.")
      .max(MINUTE_CEILING, "O horário não pode passar de 24:00 (1440 min).")
      .refine(multipleOf30, "A faixa deve terminar em múltiplos de 30 minutos.")
      .nullable(),
    slot_minutes: z
      .number()
      .int("A duração do slot deve ser um número inteiro de minutos.")
      .positive("A duração do slot deve ser maior que zero.")
      .nullable()
      .default(null),
  })
  .refine(
    (input) => (input.start_minute === null) === (input.end_minute === null),
    {
      message:
        "Informe início e fim juntos (faixa parcial) ou deixe ambos vazios (dia inteiro).",
      path: ["end_minute"],
    },
  )
  .refine(
    (input) =>
      input.start_minute === null ||
      input.end_minute === null ||
      input.end_minute > input.start_minute,
    {
      message: "O horário final deve ser maior que o inicial.",
      path: ["end_minute"],
    },
  )
  // Aditivo exige faixa (não pode ser dia inteiro).
  .refine(
    (input) =>
      input.override_type !== "add" ||
      (input.start_minute !== null && input.end_minute !== null),
    {
      message: "Uma disponibilidade extra precisa de um horário de início e fim.",
      path: ["start_minute"],
    },
  )
  // Aditivo exige duração de slot > 0; subtrativo ignora slot_minutes.
  .refine(
    (input) =>
      input.override_type !== "add" ||
      (input.slot_minutes !== null && input.slot_minutes > 0),
    {
      message: "Uma disponibilidade extra precisa de uma duração de slot maior que zero.",
      path: ["slot_minutes"],
    },
  )

/**
 * Alias de compatibilidade v1 (só-subtrativo). Call-sites v1 remanescentes
 * (`create-availability-exception`) ainda o referenciam; migram no Plano 02.
 *
 * @deprecated Use `createAvailabilityOverrideSchema`.
 */
export const createAvailabilityExceptionSchema = z
  .object({
    exception_date: z
      .string()
      .refine(isValidIsoDate, "Data inválida (use AAAA-MM-DD)."),
    start_minute: z
      .number()
      .int("O horário inicial deve ser um número inteiro de minutos.")
      .min(0, "O horário inicial não pode ser negativo.")
      .max(MINUTE_CEILING, "O horário não pode passar de 24:00 (1440 min).")
      .refine(multipleOf30, "A faixa deve começar em múltiplos de 30 minutos.")
      .nullable(),
    end_minute: z
      .number()
      .int("O horário final deve ser um número inteiro de minutos.")
      .max(MINUTE_CEILING, "O horário não pode passar de 24:00 (1440 min).")
      .refine(multipleOf30, "A faixa deve terminar em múltiplos de 30 minutos.")
      .nullable(),
  })
  .refine(
    (input) => (input.start_minute === null) === (input.end_minute === null),
    {
      message:
        "Informe início e fim juntos (faixa parcial) ou deixe ambos vazios (dia inteiro).",
      path: ["end_minute"],
    },
  )
  .refine(
    (input) =>
      input.start_minute === null ||
      input.end_minute === null ||
      input.end_minute > input.start_minute,
    {
      message: "O horário final deve ser maior que o inicial.",
      path: ["end_minute"],
    },
  )

/**
 * Salvar em lote (D-17): a grade recorrente completa + os overrides adicionados e
 * os removidos (por id). Consumido pela action do salvar-em-lote (Plano 02).
 */
export const saveAvailabilitySchema = z.object({
  rules: z.array(availabilityRuleSchema),
  overridesAdd: z.array(createAvailabilityOverrideSchema),
  overridesRemove: z.array(
    z.object({
      id: z.string().uuid("Id de override inválido."),
    }),
  ),
})

export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>
export type SaveAvailabilityRulesInput = z.infer<
  typeof saveAvailabilityRulesSchema
>
export type CreateAvailabilityOverrideInput = z.infer<
  typeof createAvailabilityOverrideSchema
>
export type SaveAvailabilityInput = z.infer<typeof saveAvailabilitySchema>
/** @deprecated Use `CreateAvailabilityOverrideInput`. */
export type CreateAvailabilityExceptionInput = z.infer<
  typeof createAvailabilityExceptionSchema
>

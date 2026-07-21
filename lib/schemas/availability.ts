import { z } from "zod"

/**
 * Schemas de validação da disponibilidade (AGENDA-01/AGENDA-03, Fase 6).
 * Validação no boundary (actions, Plano 03) espelhando os CHECK constraints do
 * DB: minutos múltiplos de 30, fim maior que início, nullability coerente da
 * exceção (ambos preenchidos ou ambos null, D-04). Mensagens PT-BR inline.
 */

const multipleOf30 = (value: number) => value % 30 === 0

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
      .refine(multipleOf30, "A faixa deve começar em múltiplos de 30 minutos."),
    end_minute: z
      .number()
      .int("O horário final deve ser um número inteiro de minutos.")
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

/** Criação de uma exceção subtrativa (dia inteiro ou faixa parcial, D-04). */
export const createAvailabilityExceptionSchema = z
  .object({
    exception_date: z
      .string()
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Data da exceção inválida.",
      ),
    start_minute: z
      .number()
      .int("O horário inicial deve ser um número inteiro de minutos.")
      .min(0, "O horário inicial não pode ser negativo.")
      .refine(multipleOf30, "A faixa deve começar em múltiplos de 30 minutos.")
      .nullable(),
    end_minute: z
      .number()
      .int("O horário final deve ser um número inteiro de minutos.")
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

export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>
export type SaveAvailabilityRulesInput = z.infer<
  typeof saveAvailabilityRulesSchema
>
export type CreateAvailabilityExceptionInput = z.infer<
  typeof createAvailabilityExceptionSchema
>

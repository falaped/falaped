import { z } from "zod"

import { getScaleByKey } from "@/lib/scales"

/**
 * Entrada da aplicação de escala. O cliente manda apenas QUAL escala e QUAIS
 * respostas — escore e interpretação são calculados na action a partir de
 * `lib/scales/`. Escore vindo do browser seria escore que o browser pode mentir.
 */
export const createScaleResultSchema = z.object({
  patientId: z.uuid("Paciente inválido."),
  caseId: z.uuid("Atendimento inválido.").nullish(),
  scaleKey: z
    .string()
    .refine((key) => getScaleByKey(key) !== null, "Escala não encontrada."),
  answers: z.record(z.string(), z.number().int()),
})

export const deleteScaleResultSchema = z.object({
  id: z.uuid("Registro inválido."),
  patientId: z.uuid("Paciente inválido."),
  caseId: z.uuid("Atendimento inválido.").nullish(),
})

export type CreateScaleResultFormData = z.output<typeof createScaleResultSchema>
export type DeleteScaleResultFormData = z.output<typeof deleteScaleResultSchema>

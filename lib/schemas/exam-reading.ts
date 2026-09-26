import { z } from "zod"

/** Comparação do valor com a faixa IMPRESSA no laudo. `unknown` = sem faixa no laudo. */
export const examReadingFlagSchema = z.enum(["normal", "low", "high", "unknown"])

const optionalText = (max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      const s = v == null ? "" : String(v).trim()
      return s === "" ? null : s.slice(0, max)
    })

/**
 * Um analito lido do exame. O modelo devolve e o médico confirma no MESMO
 * formato — a validação serve às duas bordas (resposta da IA e input da action).
 * `value` é string de propósito: preserva vírgula decimal e resultados
 * qualitativos ("Negativo", "Reagente").
 */
export const examReadingItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  value: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim().slice(0, 60)),
  unit: optionalText(40),
  reference: optionalText(120),
  flag: examReadingFlagSchema.catch("unknown"),
  page: z.number().int().min(1).catch(1),
})

export const examReadingInfoSchema = z.object({
  laboratory: optionalText(120),
  collected_at: optionalText(40),
  exam_types: z.array(z.string().trim().max(80)).catch([]),
})

/** Resposta crua do modelo de visão para UM lote de páginas. Itens inválidos são filtrados, não derrubam o lote. */
export const extractedExamBatchSchema = z.object({
  exam: examReadingInfoSchema.catch({
    laboratory: null,
    collected_at: null,
    exam_types: [],
  }),
  items: z.array(z.unknown()).catch([]),
})

export const confirmExamReadingItemsSchema = z.array(examReadingItemSchema).max(300)

export type ExamReadingItemInput = z.infer<typeof examReadingItemSchema>
export type ExamReadingInfoInput = z.infer<typeof examReadingInfoSchema>

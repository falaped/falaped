import {
  examReadingItemSchema,
  extractedExamBatchSchema,
} from "@/lib/schemas/exam-reading"
import type { ExamReadingInfo, ExamReadingItem } from "@/modules/exam-readings/types"

export type ExtractedExam = { exam: ExamReadingInfo; items: ExamReadingItem[] }

/**
 * Funde as respostas dos lotes de páginas numa leitura só. Cada lote numera as
 * páginas de 1 a N a partir do que recebeu; `pageOffsets[i]` é quantas páginas
 * vieram ANTES do lote i, para renumerar no documento inteiro. Item que não
 * passa no schema é descartado em vez de derrubar a leitura toda.
 */
export function mergeExtractedBatches(
  rawBatches: unknown[],
  pageOffsets: number[],
): ExtractedExam {
  const exam: ExamReadingInfo = { laboratory: null, collected_at: null, exam_types: [] }
  const items: ExamReadingItem[] = []

  rawBatches.forEach((raw, i) => {
    const parsed = extractedExamBatchSchema.safeParse(raw)
    if (!parsed.success) return
    const offset = pageOffsets[i] ?? 0

    exam.laboratory ??= parsed.data.exam.laboratory
    exam.collected_at ??= parsed.data.exam.collected_at
    for (const t of parsed.data.exam.exam_types)
      if (t && !exam.exam_types.includes(t)) exam.exam_types.push(t)

    for (const rawItem of parsed.data.items) {
      const item = examReadingItemSchema.safeParse(rawItem)
      if (!item.success) continue
      items.push({ ...item.data, page: item.data.page + offset })
    }
  })

  return { exam, items }
}

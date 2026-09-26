import {
  examReadingItemSchema,
  extractedExamBatchSchema,
} from "@/lib/schemas/exam-reading"
import { computeFlagFromReference } from "@/modules/exam-readings/compute-flag-from-reference"
import type { ExamReadingInfo, ExamReadingItem } from "@/modules/exam-readings/types"

export type ExtractedExam = { exam: ExamReadingInfo; items: ExamReadingItem[] }

/**
 * Status final de um item, nesta ordem: a linha "Interpretação" impressa pelo
 * laboratório (autoridade sobre a própria faixa), depois a comparação por
 * código entre valor e faixa impressa, e só por último a comparação do modelo.
 */
export function resolveFlag(item: ExamReadingItem): ExamReadingItem["flag"] {
  if (item.lab_interpretation === "normal") return "normal"
  return computeFlagFromReference(item.value, item.reference) ?? item.flag
}

/**
 * Funde as respostas dos lotes de imagens numa leitura só. Cada lote numera as
 * imagens de 1 a N a partir do que recebeu; `imageOffsets[i]` é quantas imagens
 * vieram ANTES do lote i, e `imagesPerPage` converte índice de imagem em página
 * do documento (cada página é mandada em metades). Item que não passa no schema
 * é descartado em vez de derrubar a leitura toda; linha idêntica repetida
 * (mesmo nome, valor, unidade e faixa) entra uma vez só.
 */
export function mergeExtractedBatches(
  rawBatches: unknown[],
  imageOffsets: number[],
  imagesPerPage = 1,
): ExtractedExam {
  const exam: ExamReadingInfo = { laboratory: null, collected_at: null, exam_types: [] }
  const items: ExamReadingItem[] = []
  const seen = new Set<string>()

  rawBatches.forEach((raw, i) => {
    const parsed = extractedExamBatchSchema.safeParse(raw)
    if (!parsed.success) return
    const offset = imageOffsets[i] ?? 0

    exam.laboratory ??= parsed.data.exam.laboratory
    exam.collected_at ??= parsed.data.exam.collected_at
    for (const t of parsed.data.exam.exam_types)
      if (t && !exam.exam_types.includes(t)) exam.exam_types.push(t)

    for (const rawItem of parsed.data.items) {
      const item = examReadingItemSchema.safeParse(rawItem)
      if (!item.success) continue
      const key = [item.data.name, item.data.value, item.data.unit, item.data.reference]
        .map((v) => (v ?? "").toLowerCase().replace(/\s+/g, " "))
        .join("|")
      if (seen.has(key)) continue
      seen.add(key)
      const page = Math.ceil((item.data.page + offset) / imagesPerPage)
      items.push({ ...item.data, page, flag: resolveFlag(item.data) })
    }
  })

  return { exam, items }
}

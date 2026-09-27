import {
  examReadingItemSchema,
  extractedExamBatchSchema,
} from "@/lib/schemas/exam-reading"
import { computeFlagFromReference } from "@/modules/exam-readings/compute-flag-from-reference"
import {
  selectReferenceBand,
  type BandPatient,
} from "@/modules/exam-readings/select-reference-band"
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
  /** Idade na coleta e sexo: escolhem a faixa certa quando a célula traz várias. */
  patient: BandPatient = { ageDays: null, sex: null },
): ExtractedExam {
  const exam: ExamReadingInfo = {
    laboratory: null,
    collected_at: null,
    exam_types: [],
    patient_name: null,
    patient_birth_date: null,
    patient_age: null,
    patient_sex: null,
  }
  const items: ExamReadingItem[] = []
  const seen = new Set<string>()

  rawBatches.forEach((raw, i) => {
    const parsed = extractedExamBatchSchema.safeParse(raw)
    if (!parsed.success) return
    const offset = imageOffsets[i] ?? 0

    exam.laboratory ??= parsed.data.exam.laboratory
    exam.collected_at ??= parsed.data.exam.collected_at
    exam.patient_name ??= parsed.data.exam.patient_name
    exam.patient_birth_date ??= parsed.data.exam.patient_birth_date
    exam.patient_age ??= parsed.data.exam.patient_age
    exam.patient_sex ??= parsed.data.exam.patient_sex
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
      const reference = item.data.reference
        ? selectReferenceBand(item.data.reference, patient)
        : null
      const withBand = { ...item.data, reference }
      items.push({ ...withBand, page, flag: resolveFlag(withBand) })
    }
  })

  return { exam, items }
}

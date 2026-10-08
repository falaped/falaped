import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"

export const MAX_SUGGESTED_MEDICATIONS = 6
export const MAX_SUGGESTED_EXAMS = 15

export type GeneratedPrescriptionTemplate = {
  suggestedName: string
  medications: Array<{ name: string; posology: string; duration?: string }>
  orientations?: string
}

export type GeneratedExamPanel = { suggestedName: string; exams: string[] }

/** Lê o JSON do modelo, corta excessos e descarta itens sem nome ou sem como tomar. */
export function parsePrescriptionTemplate(raw: string, fallbackName: string): GeneratedPrescriptionTemplate {
  let parsed: Record<string, unknown> = {}
  try {
    const value = JSON.parse(stripJsonFences(raw.trim()))
    if (value && typeof value === "object" && !Array.isArray(value)) parsed = value
  } catch {
    // resposta inválida: segue vazia
  }
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "")
  const medications = (Array.isArray(parsed.medications) ? parsed.medications : [])
    .map((item) => {
      const med = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      return { name: text(med.name, 200), posology: text(med.posology, 300), duration: text(med.duration, 100) || undefined }
    })
    .filter((med) => med.name && med.posology)
    .slice(0, MAX_SUGGESTED_MEDICATIONS)
  return {
    suggestedName: text(parsed.suggestedName, 120) || fallbackName.slice(0, 120),
    medications,
    orientations: text(parsed.orientations, 1000) || undefined,
  }
}

/** Mantém só exames do catálogo (sem diferenciar maiúsculas), com o nome do catálogo e sem repetir. */
export function parseExamPanel(raw: string, fallbackName: string, catalog: string[]): GeneratedExamPanel {
  let parsed: Record<string, unknown> = {}
  try {
    const value = JSON.parse(stripJsonFences(raw.trim()))
    if (value && typeof value === "object" && !Array.isArray(value)) parsed = value
  } catch {
    // resposta inválida: segue vazia
  }
  const byKey = new Map(catalog.map((name) => [name.trim().toLowerCase(), name]))
  const exams = [
    ...new Set(
      (Array.isArray(parsed.exams) ? parsed.exams : [])
        .map((exam) => (typeof exam === "string" ? byKey.get(exam.trim().toLowerCase()) : undefined))
        .filter((exam): exam is string => !!exam),
    ),
  ].slice(0, MAX_SUGGESTED_EXAMS)
  const name = typeof parsed.suggestedName === "string" ? parsed.suggestedName.trim().slice(0, 120) : ""
  return { suggestedName: name || fallbackName.slice(0, 120), exams }
}

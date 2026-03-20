import type { PrescriptionMedication } from "./types"

/**
 * First line of each item in the prescription PDF (bullet + medicamento).
 */
export function medicationDescriptionLine(m: PrescriptionMedication): string {
  const description = [m.name?.trim(), m.dosage?.trim()].filter(Boolean).join(" - ").trim()
  return description || m.name?.trim() || "—"
}

export type MedicationDetailParts = {
  posology?: string
  duration?: string
  /** Already plain text (HTML stripped on server or client). */
  observationsPlain?: string
}

/**
 * Lines under the medication title: labeled fields, one per line (PDFKit keeps same left indent).
 */
export function medicationDetailLinesFromParts(parts: MedicationDetailParts): string {
  const lines: string[] = []
  if (parts.posology?.trim()) lines.push(`Posologia: ${parts.posology.trim()}`)
  if (parts.duration?.trim()) lines.push(`Duração: ${parts.duration.trim()}`)
  if (parts.observationsPlain?.trim()) lines.push(`Observações: ${parts.observationsPlain.trim()}`)
  return lines.join("\n")
}

/**
 * Returns the same paragraph texts used in the PDF, for preview.
 * No dependency on PdfBuilder so this can be used in client components.
 */
import { stripHtml } from "@/lib/formatters"
import type { DoctorInfo, PrescriptionPayload } from "./types"

function doctorSignature(doctor: DoctorInfo): string {
  const name = [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() || "Médico(a)"
  const crm = doctor.crm?.trim() ? `CRM: ${doctor.crm}` : ""
  return crm ? `${name}\n${crm}` : name
}

/**
 * Returns the same paragraph texts used in the PDF, for preview.
 * Last two entries are signature line placeholder and doctor signature.
 */
export function getPrescriptionPreviewParagraphs(
  payload: PrescriptionPayload,
  doctor: DoctorInfo,
  locationState: string,
  issuedAt: string,
): string[] {
  const patientLine =
    payload.patientName?.trim() && payload.birthDate?.trim()
      ? `Paciente: ${payload.patientName}, nascido(a) em ${payload.birthDate}.`
      : payload.patientName?.trim()
        ? `Paciente: ${payload.patientName}.`
        : ""

  const locationDate = `${locationState}, ${issuedAt}`
  const sig = "_________________________"
  const doctorLine = doctorSignature(doctor)

  const lines: string[] = ["Receita médica", ""]
  if (patientLine) lines.push(patientLine, "")
  lines.push(`Data: ${issuedAt}`, "")

  payload.medications.forEach((m, i) => {
    const parts = [`${i + 1}. ${m.name}`]
    if (m.dosage?.trim()) parts.push(m.dosage.trim())
    parts.push(`   Posologia: ${m.posology}`)
    if (m.duration?.trim()) parts.push(`   Duração: ${m.duration}`)
    if (m.observations?.trim())
      parts.push(`   Observações: ${stripHtml(m.observations).trim()}`)
    lines.push(parts.join(" - "), "")
  })

  if (payload.orientations?.trim()) {
    lines.push("Orientações: " + stripHtml(payload.orientations).trim(), "")
  }
  if (payload.warningSigns?.trim()) {
    lines.push("Sinais de alerta: " + stripHtml(payload.warningSigns).trim(), "")
  }
  if (payload.additionalNotes?.trim()) {
    lines.push("Anotações adicionais: " + stripHtml(payload.additionalNotes).trim(), "")
  }

  lines.push(locationDate, sig, doctorLine)
  return lines
}

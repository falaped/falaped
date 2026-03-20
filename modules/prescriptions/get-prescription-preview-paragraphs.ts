/**
 * Returns the same paragraph texts used in the PDF, for preview.
 * No dependency on PdfBuilder so this can be used in client components.
 */
import { prescriptionFieldToPlainText } from "@/lib/formatters"
import {
  medicationDescriptionLine,
  medicationDetailLinesFromParts,
} from "./format-medication-prescription-lines"
import type { DoctorInfo, PrescriptionPayload } from "./types"

function doctorSignature(doctor: DoctorInfo): string {
  const name = [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() || "Médico(a)"
  const lines = [name]
  if (doctor.crm?.trim()) lines.push(`CRM: ${doctor.crm.trim()}`)
  if (doctor.rqe?.trim()) lines.push(`RQE: ${doctor.rqe.trim()}`)
  return lines.join("\n")
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
  lines.push("Prescrição:", "")

  payload.medications.forEach((m) => {
    const details = medicationDetailLinesFromParts({
      posology: m.posology,
      duration: m.duration,
      observationsPlain: m.observations?.trim()
        ? prescriptionFieldToPlainText(m.observations)
        : "",
    })
    const title = `• ${medicationDescriptionLine(m)}`
    lines.push(details ? `${title}\n${details}` : title, "")
  })

  if (payload.orientations?.trim()) {
    lines.push("Orientações: " + prescriptionFieldToPlainText(payload.orientations), "")
  }
  if (payload.warningSigns?.trim()) {
    lines.push("Sinais de alerta: " + prescriptionFieldToPlainText(payload.warningSigns), "")
  }
  if (payload.additionalNotes?.trim()) {
    lines.push("Anotações adicionais: " + prescriptionFieldToPlainText(payload.additionalNotes), "")
  }

  lines.push(locationDate, sig, doctorLine)
  return lines
}

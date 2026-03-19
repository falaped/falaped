/**
 * Generates a prescription PDF buffer using @falaped/falaped-kit.
 */
import { buildPrescriptionPdf } from "@falaped/falaped-kit/pdf"
import type { DoctorInfo, PrescriptionPayload } from "./types"

export type GeneratePrescriptionPdfParams = {
  payload: PrescriptionPayload
  doctor: DoctorInfo
  locationState: string
  issuedAt: string
}

/**
 * Returns the PDF as a Buffer. Caller can send as download or save to storage.
 */
export async function generatePrescriptionPdf(
  params: GeneratePrescriptionPdfParams,
): Promise<Buffer> {
  const { payload, doctor, issuedAt } = params
  const patientName = payload.patientName?.trim() ?? ""
  const doctorName = [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() || "Médico(a)"
  const doctorCrm = doctor.crm?.trim() ?? ""

  const items = (payload.medications ?? []).map((m) => {
    const description = [m.name, m.dosage].filter(Boolean).join(" - ")
    const posology = [m.posology, m.duration, m.observations].filter(Boolean).join("; ")
    return { description: description || "—", posology: posology || "—" }
  })

  const notes = [payload.orientations, payload.additionalNotes].filter(Boolean).join("\n").trim() || undefined

  return buildPrescriptionPdf({
    patientName,
    date: issuedAt,
    items,
    doctorName,
    doctorCrm,
    notes,
  })
}

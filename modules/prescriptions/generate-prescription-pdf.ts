/**
 * Generates a prescription PDF buffer using @falaped/falaped-kit.
 * Delegates to `generatePrescriptionPdf` from the kit (0.2.7+), which maps payload,
 * renders extra sections (orientações, alertas, notas) with HTML→text via the kit,
 * and builds the same layout as the prontuário.
 */
import {
  generatePrescriptionPdf as generatePrescriptionPdfFromKit,
  htmlToPlainTextForPdf,
} from "@falaped/falaped-kit/pdf"
import {
  medicationDescriptionLine,
  medicationDetailLinesFromParts,
} from "./format-medication-prescription-lines"
import type { DoctorInfo, PrescriptionPayload } from "./types"

export type GeneratePrescriptionPdfParams = {
  payload: PrescriptionPayload
  doctor: DoctorInfo
  locationState: string
  issuedAt: string
  /** City - State (or similar) for the PDF footer. */
  locationDisplay: string
  logoBuffer?: Buffer | null
}

/**
 * Returns the PDF as a Buffer. Caller can send as download or save to storage.
 */
export async function generatePrescriptionPdf(
  params: GeneratePrescriptionPdfParams,
): Promise<Buffer> {
  const { payload, doctor, issuedAt, locationDisplay, logoBuffer, locationState } = params

  const medicationsForKit = (payload.medications ?? []).map((m) => {
    const observationsPlain = m.observations?.trim()
      ? htmlToPlainTextForPdf(m.observations)
      : ""
    const posology = medicationDetailLinesFromParts({
      posology: m.posology,
      duration: m.duration,
      observationsPlain,
    })
    return {
      name: m.name,
      description: medicationDescriptionLine(m),
      posology,
    }
  })

  return generatePrescriptionPdfFromKit({
    payload: {
      patientName: payload.patientName,
      birthDate: payload.birthDate,
      medications: medicationsForKit,
      orientations: payload.orientations,
      warningSigns: payload.warningSigns,
      additionalNotes: payload.additionalNotes,
    },
    doctor: {
      firstName: doctor.firstName,
      surname: doctor.surname,
      crm: doctor.crm?.trim() || undefined,
      rqe: doctor.rqe?.trim() || undefined,
    },
    issuedAt: issuedAt.trim(),
    locationDisplay: locationDisplay?.trim() || undefined,
    locationState: locationState?.trim() || undefined,
    logoBuffer: logoBuffer ?? undefined,
  })
}

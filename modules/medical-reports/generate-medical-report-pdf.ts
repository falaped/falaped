/**
 * Generates a medical report (relatório médico) PDF buffer using @falaped/falaped-kit.
 * The free rich-text body (TipTap HTML) is converted to plain text, then rendered by the
 * kit's certificate builder — título + corpo único. No direct PDF engine, no multi-section
 * layout builder (D-16). The title/finalidade becomes the document heading.
 */
import {
  htmlToPlainTextForPdf,
  buildMedicalCertificatePdf,
} from "@falaped/falaped-kit/pdf"
import type { DoctorInfo, MedicalReportPayload } from "./types"

export type GenerateMedicalReportPdfParams = {
  payload: MedicalReportPayload
  doctor: DoctorInfo
  issuedAt: string
  /** Footer location string (e.g. "Osasco - São Paulo"). */
  locationDisplay: string
  logoBuffer?: Buffer | null
}

/**
 * Returns the medical report PDF as a Buffer. Caller can send as download or save to storage.
 */
export async function generateMedicalReportPdf(
  params: GenerateMedicalReportPdfParams,
): Promise<Buffer> {
  const { payload, doctor, issuedAt, locationDisplay, logoBuffer } = params
  const patientName = payload.patientName?.trim() || ""
  const doctorName =
    [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() ||
    "Médico(a)"
  const doctorCrm = doctor.crm?.trim() ?? ""
  const doctorRqe = doctor.rqe?.trim()

  const bodyText = htmlToPlainTextForPdf(payload.bodyHtml)

  const input: Parameters<typeof buildMedicalCertificatePdf>[0] = {
    certificateTitle: payload.title.trim().toUpperCase(),
    patientName,
    date: issuedAt,
    body: bodyText,
    doctorName,
    doctorCrm,
    consultationDateFormatted: issuedAt,
    consultationLocation: locationDisplay?.trim() || undefined,
    logoFooter: logoBuffer ?? undefined,
  }
  if (doctorRqe) input.doctorRqe = doctorRqe

  return buildMedicalCertificatePdf(input)
}

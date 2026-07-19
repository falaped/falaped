/**
 * Generates a referral (encaminhamento) PDF buffer using @falaped/falaped-kit.
 * Single free body via buildMedicalCertificatePdf — NEVER pdfkit, NEVER buildReportPdf (D-16).
 */
import { buildMedicalCertificatePdf } from "@falaped/falaped-kit/pdf"
import { getReferralBodySegments } from "./get-referral-body-segments"
import type { DoctorInfo, ReferralPayload } from "./types"

export type GenerateReferralPdfParams = {
  payload: ReferralPayload
  doctor: DoctorInfo
  issuedAt: string
  /** Footer location string (e.g. "Osasco - São Paulo"). */
  locationDisplay: string
  logoBuffer?: Buffer | null
}

function bodySegmentsToText(payload: ReferralPayload): string {
  const paragraphs = getReferralBodySegments(payload)
  return paragraphs
    .filter((p) => p.length > 0)
    .map((p) => p.map((s) => s.text).join(""))
    .join("\n\n")
}

/**
 * Returns the referral PDF as a Buffer. Caller can send as download or save to storage.
 */
export async function generateReferralPdf(
  params: GenerateReferralPdfParams,
): Promise<Buffer> {
  const { payload, doctor, issuedAt, locationDisplay, logoBuffer } = params
  const patientName = payload.patientName?.trim() || ""
  const doctorName =
    [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() ||
    "Médico(a)"
  const doctorCrm = doctor.crm?.trim() ?? ""
  const doctorRqe = doctor.rqe?.trim()

  const input: Parameters<typeof buildMedicalCertificatePdf>[0] = {
    certificateTitle: "ENCAMINHAMENTO",
    patientName,
    date: issuedAt,
    body: bodySegmentsToText(payload),
    doctorName,
    doctorCrm,
    consultationDateFormatted: issuedAt,
    consultationLocation: locationDisplay?.trim() || undefined,
    logoFooter: logoBuffer ?? undefined,
  }
  if (doctorRqe) input.doctorRqe = doctorRqe

  return buildMedicalCertificatePdf(input)
}

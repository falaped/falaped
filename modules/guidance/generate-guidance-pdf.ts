/**
 * Gera o PDF do documento de orientação usando @falaped/falaped-kit.
 * Corpo livre único via o builder de certificado do kit — sem engine direta de PDF,
 * sem builder multi-seção (D-16). Nunca pdfkit/buildReportPdf.
 */
import { buildMedicalCertificatePdf } from "@falaped/falaped-kit/pdf"
import type { DoctorInfo, GuidanceDocumentPayload } from "./types"

export type GenerateGuidancePdfParams = {
  payload: GuidanceDocumentPayload
  doctor: DoctorInfo
  issuedAt: string
  /** Footer location string (e.g. "Osasco - São Paulo"). */
  locationDisplay: string
  logoBuffer?: Buffer | null
}

/** Monta o corpo do documento: rótulo do marco + texto da orientação. */
function bodySegmentsToText(payload: GuidanceDocumentPayload): string {
  const paragraphs: string[] = []
  const milestone = payload.milestone?.trim()
  const body = payload.body?.trim()
  if (milestone) paragraphs.push(`Marco: ${milestone}`)
  if (body) paragraphs.push(body)
  return paragraphs.filter((p) => p.length > 0).join("\n\n")
}

/**
 * Retorna o PDF da orientação como Buffer. O caller pode baixar ou salvar no storage.
 */
export async function generateGuidancePdf(
  params: GenerateGuidancePdfParams,
): Promise<Buffer> {
  const { payload, doctor, issuedAt, locationDisplay, logoBuffer } = params
  const patientName = payload.patientName?.trim() || ""
  const doctorName =
    [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() ||
    "Médico(a)"
  const doctorCrm = doctor.crm?.trim() ?? ""
  const doctorRqe = doctor.rqe?.trim()

  const input: Parameters<typeof buildMedicalCertificatePdf>[0] = {
    certificateTitle: "ORIENTAÇÕES",
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

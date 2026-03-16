/**
 * Builds medical certificate PDF content into the given PdfBuilder.
 * Layout: header (logo, title) → patient block → body → signature → footer (logo, Pediatra, date). No border, no separators.
 */
import type { PdfBuilder } from "@/lib/pdf/pdf-builder"
import type {
  DoctorInfo,
  ComparecimentoPayload,
  AptidaoFisicaPayload,
  MedicoPayload,
  AcompanhantePayload,
  MedicalCertificateType,
} from "./types"
import { getMedicalCertificateBodySegments } from "./get-medical-certificate-body-segments"
import { getCertificateTitle, formatDoctorLine } from "./get-medical-certificate-preview-content"
import { CERT_LAYOUT as LAYOUT } from "@/lib/pdf/pdf-builder"

type PayloadUnion =
  | ComparecimentoPayload
  | AptidaoFisicaPayload
  | MedicoPayload
  | AcompanhantePayload

export type BuildMedicalCertificatePdfContentParams = {
  builder: PdfBuilder
  type: MedicalCertificateType
  payload: PayloadUnion
  doctor: DoctorInfo
  locationState: string
  issuedAt: string
  /** Footer location string (e.g. "Osasco - São Paulo"). */
  locationDisplay: string
  logoBuffer?: Buffer | null
  patientResponsible?: string | null
}

/**
 * Fills the builder with the medical certificate content (layout per plan).
 * Call builder.build() after.
 */
export function buildMedicalCertificatePdfContent(params: BuildMedicalCertificatePdfContentParams): void {
  const {
    builder,
    type,
    payload,
    doctor,
    issuedAt,
    locationDisplay,
    logoBuffer,
    patientResponsible,
  } = params

  const footerDateLocation = `${issuedAt} - ${locationDisplay}`


  builder.addTitle(getCertificateTitle(type).toUpperCase())
  builder.addSpacer(0.5)

  const patientName =
    "patientName" in payload ? payload.patientName : (payload as AcompanhantePayload).patientName
  const birthDate =
    "birthDate" in payload
      ? (payload as ComparecimentoPayload | AptidaoFisicaPayload | MedicoPayload).birthDate
      : ""
  builder.addPatientBlock({
    patientName,
    birthDate,
    responsible: patientResponsible ?? undefined,
  })

  builder.addSpacer(1.5)

  const bodyParagraphs = getMedicalCertificateBodySegments(type, payload)
  for (const paragraph of bodyParagraphs) {
    if (paragraph.length > 0) builder.addBodyParagraphSegments(paragraph)
  }


  builder.addPageFooterAtBottom(
    [`Pediatra ${formatDoctorLine(doctor)}`, footerDateLocation],
    logoBuffer,
    { footerFontSize: LAYOUT.footerSize },
  )
}

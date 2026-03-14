/**
 * Builds medical certificate PDF content into the given PdfBuilder.
 * Uses the formal copy (PT-BR) from the plan for each certificate type.
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
import { getMedicalCertificatePreviewParagraphs } from "./get-medical-certificate-preview-paragraphs"

type PayloadUnion =
  | ComparecimentoPayload
  | AptidaoFisicaPayload
  | MedicoPayload
  | AcompanhantePayload

/**
 * Fills the builder with the medical certificate content. Call builder.build() after.
 */
export function buildMedicalCertificatePdfContent(
  builder: PdfBuilder,
  type: MedicalCertificateType,
  payload: PayloadUnion,
  doctor: DoctorInfo,
  locationState: string,
  issuedAt: string,
): void {
  const paragraphs = getMedicalCertificatePreviewParagraphs(
    type,
    payload,
    doctor,
    locationState,
    issuedAt,
  )
  const sigIndex = paragraphs.indexOf("_________________________")
  const textParts = paragraphs.slice(0, sigIndex)
  const doctorLine = paragraphs[paragraphs.length - 1]

  for (const text of textParts) {
    builder.addParagraph(text)
  }
  builder.addSignatureLine()
  builder.addParagraph(doctorLine)
}

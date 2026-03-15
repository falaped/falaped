/**
 * Builds prescription PDF content into the given PdfBuilder.
 */
import type { PdfBuilder } from "@/lib/pdf/pdf-builder"
import type { DoctorInfo, PrescriptionPayload } from "./types"
import { getPrescriptionPreviewParagraphs } from "./get-prescription-preview-paragraphs"

/**
 * Fills the builder with the prescription content. Call builder.build() after.
 */
export function buildPrescriptionPdfContent(
  builder: PdfBuilder,
  payload: PrescriptionPayload,
  doctor: DoctorInfo,
  locationState: string,
  issuedAt: string,
): void {
  const paragraphs = getPrescriptionPreviewParagraphs(
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

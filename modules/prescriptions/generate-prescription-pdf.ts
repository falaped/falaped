/**
 * Generates a prescription PDF buffer.
 * Uses PdfBuilder (lib/pdf) and buildPrescriptionPdfContent (this module).
 */
import { PdfBuilder } from "@/lib/pdf/pdf-builder"
import { buildPrescriptionPdfContent } from "./build-prescription-pdf-content"
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
  const { payload, doctor, locationState, issuedAt } = params
  const builder = new PdfBuilder({ margin: 50 })
  buildPrescriptionPdfContent(builder, payload, doctor, locationState, issuedAt)
  return builder.build()
}

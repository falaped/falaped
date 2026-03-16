/**
 * Generates a medical certificate PDF buffer.
 * Uses PdfBuilder (lib/pdf) and buildMedicalCertificatePdfContent (this module).
 */
import { PdfBuilder, CERT_LAYOUT } from "@/lib/pdf/pdf-builder"
import { buildMedicalCertificatePdfContent } from "./build-medical-certificate-pdf-content"
import type {
  DoctorInfo,
  MedicalCertificateType,
  ComparecimentoPayload,
  AptidaoFisicaPayload,
  MedicoPayload,
  AcompanhantePayload,
} from "./types"

export type GenerateMedicalCertificatePdfParams = {
  type: MedicalCertificateType
  payload: ComparecimentoPayload | AptidaoFisicaPayload | MedicoPayload | AcompanhantePayload
  doctor: DoctorInfo
  locationState: string
  issuedAt: string
  /** Footer location string (e.g. "Osasco - São Paulo"). */
  locationDisplay: string
  logoBuffer?: Buffer | null
  patientResponsible?: string | null
}

/**
 * Returns the PDF as a Buffer. Caller can send as download or save to storage.
 */
export async function generateMedicalCertificatePdf(
  params: GenerateMedicalCertificatePdfParams,
): Promise<Buffer> {
  const {
    type,
    payload,
    doctor,
    locationState,
    issuedAt,
    locationDisplay,
    logoBuffer,
    patientResponsible,
  } = params
  const builder = new PdfBuilder({
    margin: 36,
    footerReservedHeight: CERT_LAYOUT.footerReservedHeight,
  })
  buildMedicalCertificatePdfContent({
    builder,
    type,
    payload,
    doctor,
    locationState,
    issuedAt,
    locationDisplay,
    logoBuffer,
    patientResponsible,
  })
  return builder.build()
}

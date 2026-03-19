/**
 * Generates a medical certificate PDF buffer using @falaped/falaped-kit.
 */
import { buildMedicalCertificatePdf } from "@falaped/falaped-kit/pdf"
import { getMedicalCertificateBodySegments } from "./get-medical-certificate-body-segments"
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

function bodySegmentsToText(
  type: MedicalCertificateType,
  payload: ComparecimentoPayload | AptidaoFisicaPayload | MedicoPayload | AcompanhantePayload,
): string {
  const paragraphs = getMedicalCertificateBodySegments(type, payload)
  return paragraphs
    .filter((p) => p.length > 0)
    .map((p) => p.map((s) => s.text).join(""))
    .join("\n\n")
}

/**
 * Returns the PDF as a Buffer. Caller can send as download or save to storage.
 */
export async function generateMedicalCertificatePdf(
  params: GenerateMedicalCertificatePdfParams,
): Promise<Buffer> {
  const { type, payload, doctor, issuedAt } = params
  const patientName =
    "patientName" in payload ? payload.patientName : (payload as AcompanhantePayload).patientName
  const doctorName = [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() || "Médico(a)"
  const doctorCrm = doctor.crm?.trim() ?? ""

  const input: Parameters<typeof buildMedicalCertificatePdf>[0] = {
    patientName,
    date: issuedAt,
    body: bodySegmentsToText(type, payload),
    doctorName,
    doctorCrm,
  }
  if (type === "medico") {
    const p = payload as MedicoPayload
    input.daysOff = p.daysAway
    if (p.cid10?.trim()) input.cid = p.cid10.trim()
  }
  return buildMedicalCertificatePdf(input)
}

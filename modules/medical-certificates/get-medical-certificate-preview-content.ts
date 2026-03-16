/**
 * Returns structured preview content matching the PDF layout (title, patient block, body, footer).
 * Used by the wizard preview; no PDF dependency so it can run in client components.
 */
import type {
  DoctorInfo,
  ComparecimentoPayload,
  AptidaoFisicaPayload,
  MedicoPayload,
  AcompanhantePayload,
  MedicalCertificateType,
} from "./types"
import { getMedicalCertificateBodySegments, type BodySegment } from "./get-medical-certificate-body-segments"

type PayloadUnion =
  | ComparecimentoPayload
  | AptidaoFisicaPayload
  | MedicoPayload
  | AcompanhantePayload

export function getCertificateTitle(type: MedicalCertificateType): string {
  switch (type) {
    case "comparecimento":
      return "Atestado de Comparecimento"
    case "aptidao_fisica":
      return "Atestado de Aptidão Física"
    case "medico":
      return "Atestado Médico"
    case "acompanhante":
      return "Atestado de Acompanhante"
  }
}

export function formatDoctorLine(doctor: DoctorInfo): string {
  const name = [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() || "Médico(a)"
  const parts: string[] = [name]
  if (doctor.crm?.trim()) parts.push(`CRM ${doctor.crm}`)
  if (doctor.rqe?.trim()) parts.push(`RQE ${doctor.rqe}`)
  return parts.join(" | ")
}

export type MedicalCertificatePreviewContent = {
  title: string
  patientBlock: {
    patientName: string
    birthDate: string
    responsible: string | null
  }
  bodyParagraphs: BodySegment[][]
  footerLines: [string, string]
}

/**
 * Returns the same structure as the PDF: title, patient block, body segments, footer lines.
 * Use this to render a preview that matches the generated PDF.
 */
export function getMedicalCertificatePreviewContent(
  type: MedicalCertificateType,
  payload: PayloadUnion,
  doctor: DoctorInfo,
  locationDisplay: string,
  issuedAt: string,
  patientResponsible: string | null | undefined,
): MedicalCertificatePreviewContent {
  const patientName =
    "patientName" in payload ? payload.patientName : (payload as AcompanhantePayload).patientName
  const birthDate =
    "birthDate" in payload
      ? (payload as ComparecimentoPayload | AptidaoFisicaPayload | MedicoPayload).birthDate
      : ""

  const bodyParagraphs = getMedicalCertificateBodySegments(type, payload)
  const footerDateLocation = `${issuedAt} - ${locationDisplay}`

  return {
    title: getCertificateTitle(type).toUpperCase(),
    patientBlock: {
      patientName,
      birthDate: birthDate ?? "",
      responsible: patientResponsible ?? null,
    },
    bodyParagraphs,
    footerLines: [`Pediatra ${formatDoctorLine(doctor)}`, footerDateLocation],
  }
}

/**
 * Returns the same paragraph texts used in the PDF, for preview.
 * No dependency on PdfBuilder so this can be used in client components.
 */
import type {
  DoctorInfo,
  ComparecimentoPayload,
  AptidaoFisicaPayload,
  MedicoPayload,
  AcompanhantePayload,
  MedicalCertificateType,
} from "./types"

function doctorSignature(doctor: DoctorInfo): string {
  const name = [doctor.firstName, doctor.surname].filter(Boolean).join(" ").trim() || "Médico(a)"
  const crm = doctor.crm?.trim() ? `CRM: ${doctor.crm}` : ""
  return crm ? `${name}\n${crm}` : name
}

function observationsText(obs: string): string {
  const t = obs?.trim()
  return `Observações: ${t || "-"}`
}

type PayloadUnion =
  | ComparecimentoPayload
  | AptidaoFisicaPayload
  | MedicoPayload
  | AcompanhantePayload

/**
 * Returns the same paragraph texts used in the PDF, for preview.
 * Last two entries are signature line placeholder and doctor signature.
 */
export function getMedicalCertificatePreviewParagraphs(
  type: MedicalCertificateType,
  payload: PayloadUnion,
  doctor: DoctorInfo,
  locationState: string,
  issuedAt: string,
): string[] {
  const locationDate = `${locationState}, ${issuedAt}`
  const sig = "_________________________"
  const doctorLine = doctorSignature(doctor)

  switch (type) {
    case "comparecimento": {
      const p = payload as ComparecimentoPayload
      return [
        `Atesto, para os devidos fins, que ${p.patientName}, nascido(a) em ${p.birthDate}, esteve sob meus cuidados médicos no dia ${p.attendanceDate}, no período das ${p.timeStart} às ${p.timeEnd}.`,
        observationsText(p.observations),
        locationDate,
        sig,
        doctorLine,
      ]
    }
    case "aptidao_fisica": {
      const p = payload as AptidaoFisicaPayload
      return [
        `Atesto que ${p.patientName}, nascido(a) em ${p.birthDate}, encontra-se APTO(A) para a prática de ${p.activities}.`,
        `Validade: ${p.validityDate}.`,
        observationsText(p.observations),
        locationDate,
        sig,
        doctorLine,
      ]
    }
    case "medico": {
      const p = payload as MedicoPayload
      const canLeave = p.canLeaveHome ? "SIM" : "NÃO"
      return [
        `Atesto que ${p.patientName}, nascido(a) em ${p.birthDate}, necessita de afastamento das atividades escolares pelo período de ${p.daysAway} dias, a contar de ${p.startDate}.`,
        `CID-10: ${p.cid10}`,
        `Pode sair de casa: ${canLeave}`,
        observationsText(p.observations),
        locationDate,
        sig,
        doctorLine,
      ]
    }
    case "acompanhante": {
      const p = payload as AcompanhantePayload
      return [
        `Atesto, para os devidos fins, que ${p.companionName} acompanhou ${p.patientName} em consulta médica no dia ${p.consultationDate}, no período das ${p.timeStart} às ${p.timeEnd}.`,
        locationDate,
        sig,
        doctorLine,
      ]
    }
  }
}

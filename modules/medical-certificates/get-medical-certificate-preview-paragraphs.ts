/**
 * Returns the same paragraph texts used in the PDF, for preview.
 * No dependency on PdfBuilder so this can be used in client components.
 */
import { stripHtml } from "@/lib/formatters"
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

function observationsLine(obs: string): string | null {
  const t = stripHtml(obs ?? "").trim()
  return t ? `Observações: ${t}` : null
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
      const periodText = p.timeStart?.trim() ? ` no período de ${p.timeStart}.` : "."
      const lines = [
        `Atesto, para os devidos fins, que ${p.patientName}, nascido(a) em ${p.birthDate}, esteve sob meus cuidados médicos no dia ${p.attendanceDate},${periodText}`,
        locationDate,
        sig,
        doctorLine,
      ]
      const obs = observationsLine(p.observations)
      if (obs) lines.splice(1, 0, obs)
      return lines
    }
    case "aptidao_fisica": {
      const p = payload as AptidaoFisicaPayload
      const lines = [
        `Atesto que ${p.patientName}, nascido(a) em ${p.birthDate}, encontra-se APTO(A) para a prática de ${p.activities}.`,
        `Validade: ${p.validity}.`,
        locationDate,
        sig,
        doctorLine,
      ]
      const obs = observationsLine(p.observations)
      if (obs) lines.splice(2, 0, obs)
      return lines
    }
    case "medico": {
      const p = payload as MedicoPayload
      const canLeave = p.canLeaveHome ? "SIM" : "NÃO"
      const lines = [
        `Atesto que ${p.patientName}, nascido(a) em ${p.birthDate}, necessita de afastamento pelo período de ${p.daysAway} dias, a contar de ${p.startDate}.`,
        `Apto à retornar para as atividades: ${canLeave}`,
        locationDate,
        sig,
        doctorLine,
      ]
      if (p.cid10?.trim()) lines.splice(1, 0, `CID-10: ${p.cid10.trim()}`)
      const obs = observationsLine(p.observations ?? "")
      if (obs) lines.splice(lines.indexOf(locationDate), 0, obs)
      return lines
    }
    case "acompanhante": {
      const p = payload as AcompanhantePayload
      const hasTime = !!p.timeStart?.trim()
      const hasPeriodo =
        !!p.periodo?.trim() && p.periodo !== "atual_data"
      const periodLabel =
        p.periodo === "matutino"
          ? "Matutino"
          : p.periodo === "vespertino"
            ? "Vespertino"
            : p.periodo === "noturno"
              ? "Noturno"
              : null
      const periodText = hasTime
        ? ` no período de ${p.timeStart}.`
        : hasPeriodo && periodLabel
          ? ` no período ${periodLabel}.`
          : "."
      const lines = [
        `Atesto, para os devidos fins, que ${p.companionName} acompanhou ${p.patientName} em consulta médica no dia ${p.consultationDate} ${periodText}`,
        locationDate,
        sig,
        doctorLine,
      ]
      const obs = observationsLine(p.observations ?? "")
      if (obs) lines.splice(1, 0, obs)
      return lines
    }
  }
}

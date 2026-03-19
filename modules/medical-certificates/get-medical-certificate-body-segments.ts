/**
 * Returns body paragraphs for the PDF as segment arrays (text + bold) for nome, datas, horários.
 * Used by generate-medical-certificate-pdf (kit input) and get-medical-certificate-preview-content.
 */
import { stripHtml } from "@/lib/formatters"
import type {
  ComparecimentoPayload,
  AptidaoFisicaPayload,
  MedicoPayload,
  AcompanhantePayload,
  MedicalCertificateType,
} from "./types"

export type BodySegment = { text: string; bold?: boolean }

function obs(observations: string): BodySegment[] | null {
  const t = stripHtml(observations ?? "").trim()
  return t ? [{ text: `Observações: ${t}` }] : null
}

type PayloadUnion =
  | ComparecimentoPayload
  | AptidaoFisicaPayload
  | MedicoPayload
  | AcompanhantePayload

/**
 * Returns body paragraphs as arrays of segments (bold for patient name, dates, times).
 */
export function getMedicalCertificateBodySegments(
  type: MedicalCertificateType,
  payload: PayloadUnion,
): Array<BodySegment[]> {
  switch (type) {
    case "comparecimento": {
      const p = payload as ComparecimentoPayload
      const periodText = p.timeStart?.trim() ? ` no período de ` : "."
      const periodSuffix = p.timeStart?.trim() ? "." : ""
      const paragraphs: BodySegment[][] = [
        [
          { text: "Atesto, para os devidos fins, que " },
          { text: p.patientName, bold: true },
          { text: ", nascido(a) em " },
          { text: p.birthDate, bold: true },
          { text: ", esteve sob meus cuidados médicos no dia " },
          { text: p.attendanceDate, bold: true },
          ...(p.timeStart?.trim()
            ? ([{ text: periodText }, { text: p.timeStart, bold: true }, { text: periodSuffix }] as BodySegment[])
            : [{ text: periodSuffix }]),
        ],
      ]
      const observations = obs(p.observations)
      if (observations) paragraphs.push(observations)
      return paragraphs
    }
    case "aptidao_fisica": {
      const p = payload as AptidaoFisicaPayload
      const paragraphs: BodySegment[][] = [
        [
          { text: "Atesto que " },
          { text: p.patientName, bold: true },
          { text: ", nascido(a) em " },
          { text: p.birthDate, bold: true },
          { text: ", encontra-se APTO(A) para a prática de " },
          { text: p.activities, bold: true },
          { text: "." },
        ],
        [{ text: "Validade: " }, { text: p.validity, bold: true }, { text: "." }],
      ]
      const observations = obs(p.observations)
      if (observations) paragraphs.push(observations)
      return paragraphs
    }
    case "medico": {
      const p = payload as MedicoPayload
      const canLeave = p.canLeaveHome ? "SIM" : "NÃO"
      const paragraphs: BodySegment[][] = [
        [
          { text: "Atesto que " },
          { text: p.patientName, bold: true },
          { text: ", nascido(a) em " },
          { text: p.birthDate, bold: true },
          { text: ", necessita de afastamento pelo período de " },
          { text: String(p.daysAway), bold: true },
          { text: " dias, a contar de " },
          { text: p.startDate, bold: true },
          { text: "." },
        ],
        [{ text: "Apto à retornar para as atividades: " }, { text: canLeave, bold: true }],
      ]
      if (p.cid10?.trim()) {
        paragraphs.splice(1, 0, [{ text: "CID-10: " }, { text: p.cid10.trim(), bold: true }])
      }
      const observations = obs(p.observations ?? "")
      if (observations) paragraphs.push(observations)
      return paragraphs
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
      const periodSegments: BodySegment[] = hasTime
        ? ([{ text: " no período de " }, { text: p.timeStart!, bold: true }, { text: "." }] as BodySegment[])
        : hasPeriodo && periodLabel
          ? ([{ text: " no período " }, { text: periodLabel, bold: true }, { text: "." }] as BodySegment[])
          : [{ text: "." }]
      const paragraphs: BodySegment[][] = [
        [
          { text: "Atesto, para os devidos fins, que " },
          { text: p.companionName, bold: true },
          { text: " acompanhou " },
          { text: p.patientName, bold: true },
          { text: " em consulta médica no dia " },
          { text: p.consultationDate, bold: true },
          ...periodSegments,
        ],
      ]
      const observations = obs(p.observations ?? "")
      if (observations) paragraphs.push(observations)
      return paragraphs
    }
  }
}

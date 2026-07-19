/**
 * Returns body paragraphs for the referral PDF as segment arrays (text + bold).
 * Used by generate-referral-pdf (kit input) — composes especialidade, motivo,
 * resumo clínico and urgência into PT-BR paragraphs.
 */
import type { ReferralPayload, ReferralUrgency } from "./types"

export type BodySegment = { text: string; bold?: boolean }

const URGENCY_LABELS: Record<ReferralUrgency, string> = {
  rotina: "Rotina",
  prioritario: "Prioritário",
  urgente: "Urgente",
}

/**
 * Returns body paragraphs as arrays of segments (bold for the destination and urgency).
 */
export function getReferralBodySegments(
  payload: ReferralPayload,
): Array<BodySegment[]> {
  const paragraphs: BodySegment[][] = []

  const specialty = payload.specialty?.trim()
  if (specialty) {
    paragraphs.push([
      { text: "Encaminho o(a) paciente ao serviço de " },
      { text: specialty, bold: true },
      { text: "." },
    ])
  }

  const reason = payload.reason?.trim()
  if (reason) {
    paragraphs.push([{ text: "Motivo: " }, { text: reason }])
  }

  const clinicalSummary = payload.clinicalSummary?.trim()
  if (clinicalSummary) {
    paragraphs.push([
      { text: "Resumo clínico / hipótese: " },
      { text: clinicalSummary },
    ])
  }

  const urgencyLabel = URGENCY_LABELS[payload.urgency] ?? URGENCY_LABELS.rotina
  paragraphs.push([{ text: "Prioridade: " }, { text: urgencyLabel, bold: true }])

  return paragraphs
}

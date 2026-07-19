/**
 * Returns body paragraphs for the exam request PDF as segment arrays (text + bold).
 * Used by generate-exam-request-pdf (kit input) — composes a lista de exames (um por
 * linha), hipótese/indicação e observações em parágrafos PT-BR.
 */
import type { ExamRequestPayload } from "./types"

export type BodySegment = { text: string; bold?: boolean }

/**
 * Returns body paragraphs as arrays of segments (bold for the labels).
 */
export function getExamRequestBodySegments(
  payload: ExamRequestPayload,
): Array<BodySegment[]> {
  const paragraphs: BodySegment[][] = []

  const exams = (payload.exams ?? [])
    .map((e) => e?.trim())
    .filter((e): e is string => !!e)

  if (exams.length > 0) {
    paragraphs.push([{ text: "Solicito os seguintes exames:", bold: true }])
    for (const exam of exams) {
      paragraphs.push([{ text: `- ${exam}` }])
    }
  }

  const hypothesis = payload.hypothesis?.trim()
  if (hypothesis) {
    paragraphs.push([
      { text: "Hipótese / indicação: ", bold: true },
      { text: hypothesis },
    ])
  }

  const observations = payload.observations?.trim()
  if (observations) {
    paragraphs.push([
      { text: "Observações: ", bold: true },
      { text: observations },
    ])
  }

  return paragraphs
}

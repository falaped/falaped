/**
 * Sanitizes assistant free-text before persistence (strips UI-mimic lines the model may output).
 * `CLINICAL_NOTATION_SUMMARY_MESSAGE` is kept for merging legacy persisted payloads in the UI.
 */

/**
 * Removes lines the model sometimes copies from old UI patterns (not clinical sections).
 */
export function stripAssistantUiLabelsFromReply(text: string): string {
  const lines = text.split(/\r?\n/)
  while (lines.length > 0) {
    const first = lines[0]?.trim() ?? ""
    if (first === "") {
      lines.shift()
      continue
    }
    if (/^dados anotados\.?$/i.test(first) || /^detalhes:?\s*$/i.test(first)) {
      lines.shift()
      continue
    }
    break
  }
  return lines.join("\n").trim()
}

/** Legacy stub `content` when structured body lived in structuredClinicalNote (removed from new payloads). */
export const CLINICAL_NOTATION_SUMMARY_MESSAGE = "Dados anotados"

/** @deprecated Use CLINICAL_NOTATION_SUMMARY_MESSAGE */
export const CLINICAL_ASSISTANT_ACK_MESSAGE = CLINICAL_NOTATION_SUMMARY_MESSAGE

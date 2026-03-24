const FALAPED_JSON_PREFIX = "__FALAPED_JSON__"

/**
 * Full BMI template replies are long and encourage the model to copy-paste them on unrelated turns.
 */
function compressBmiBlockForModelContext(plainContent: string): string {
  const trimmed = plainContent.trim()
  if (!/^IMC estimado:/i.test(trimmed)) {
    return plainContent
  }
  const firstLine =
    trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? trimmed
  return `[IMC já calculado no fio: ${firstLine}]`
}

/**
 * Turns persisted assistant payloads into plain text for LLM context (avoids raw JSON blobs).
 */
export function assistantMessageToModelText(content: string): string {
  if (!content.startsWith(FALAPED_JSON_PREFIX)) {
    return compressBmiBlockForModelContext(content)
  }

  try {
    const payload = JSON.parse(content.slice(FALAPED_JSON_PREFIX.length)) as {
      type?: string
      content?: string
      structuredClinicalNote?: string
    }

    if (payload.type === "assistant_report_file") {
      return payload.content ?? "[Relatório gerado neste caso.]"
    }

    const main = payload.content?.trim() ?? ""
    const note = payload.structuredClinicalNote?.trim()
    const LEGACY_STUB = "Dados anotados"

    if (note && main === LEGACY_STUB) {
      return compressBmiBlockForModelContext(note) || content.slice(0, 2000)
    }

    const parts: string[] = []
    if (main) {
      parts.push(compressBmiBlockForModelContext(main))
    }
    if (note) {
      parts.push(note)
    }

    return parts.join("\n\n").trim() || content.slice(0, 2000)
  } catch {
    return content.slice(0, 2000)
  }
}

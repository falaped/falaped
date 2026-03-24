/**
 * Removes the standard IMC calculation template from the start of assistant text
 * when the model echoes it on a turn that did not request BMI.
 */
export function stripImcCalculationTemplatePrefix(reply: string): string {
  const lines = reply.split(/\r?\n/)
  let index = 0
  while (index < lines.length) {
    const trimmed = lines[index]?.trim() ?? ""
    if (trimmed === "") {
      index += 1
      continue
    }
    const isImcTemplateLine =
      /^IMC estimado:/i.test(trimmed) ||
      /^Fórmula:/i.test(trimmed) ||
      /^Conta:/i.test(trimmed) ||
      /^Dados utilizados neste cálculo:/i.test(trimmed) ||
      /^Confirme se esses valores/i.test(trimmed)
    if (isImcTemplateLine) {
      index += 1
      continue
    }
    break
  }
  return lines.slice(index).join("\n").trim()
}

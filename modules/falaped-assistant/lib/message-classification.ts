import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"

export function isCommandLikeMessage(content: string): boolean {
  const normalized = normalizeText(content)
  return (
    normalized.includes("/resumo") ||
    normalized.includes("/imc") ||
    /\bimc\b/.test(normalized) ||
    normalized.includes("/relatorio") ||
    normalized.includes("/encerrar") ||
    normalized.includes("/atestado") ||
    normalized.includes("/receita") ||
    normalized.includes("resumir principais pontos") ||
    normalized.includes("calcular imc") ||
    normalized.includes("sugerir perguntas para o responsavel") ||
    normalized.includes("sugererir perguntas ao responsavel") ||
    normalized.includes("sugerir perguntas ao responsavel") ||
    normalized.includes("gerar relatorio") ||
    normalized.includes("encerrar caso") ||
    normalized.includes("gerar atestado") ||
    normalized.includes("gerar receita") ||
    normalized.includes("confirmar geracao de relatorio") ||
    normalized.includes("confirmar geracao de atestado") ||
    normalized.includes("confirmar geracao de receita") ||
    normalized.includes("confirmar atualização dos dados do paciente") ||
    normalized.includes("confirmar atualizacao dos dados do paciente") ||
    normalized.includes("não atualizar dados do paciente") ||
    normalized.includes("nao atualizar dados do paciente") ||
    normalized.includes("confirmar novos dados antropometricos") ||
    normalized.includes("usar novos dados antropometricos") ||
    normalized.includes("manter valores anteriores") ||
    normalized.includes("manter dados anteriores") ||
    normalized.includes("salvar alerta para resumo e relatorio") ||
    normalized.includes("confirmar armazenamento de alerta") ||
    normalized.includes("nao armazenar alerta") ||
    normalized.includes("não armazenar alerta") ||
    normalized.includes("cancelar acao") ||
    normalized.includes("cancelar ação")
  )
}

export function isQuestionLikeMessage(message: string): boolean {
  const normalized = normalizeText(message)
  return (
    message.includes("?") ||
    /\b(como|qual|quais|quando|devo|deveria|deveriamos|estrategia|o que|por que|porque)\b/.test(normalized)
  )
}

export function isLikelyDictationMessage(userMessage: string): boolean {
  const normalized = normalizeText(userMessage)
  if (normalized.includes("?")) return false
  if (
    /\b(resumir|calcular|gerar|encerrar|fechar|sugerir perguntas|analise|analisar)\b/.test(normalized)
  ) {
    return false
  }
  return userMessage.trim().length >= 20
}

export function isBmiConfirmationMessage(userMessage: string): boolean {
  const normalized = normalizeText(userMessage)
  return (
    /\bimc\b/.test(normalized) &&
    (/confirmad/.test(normalized) || /\bconfirmo\b/.test(normalized) || /\bpode confirmar\b/.test(normalized))
  )
}

export function isGuardianAlertConfirmOrDeclineMessage(text: string): boolean {
  const normalized = normalizeText(text.trim())
  return (
    normalized.includes("salvar alerta para resumo e relatorio") ||
    normalized.includes("confirmar armazenamento de alerta") ||
    normalized.includes("nao armazenar alerta") ||
    normalized.includes("não armazenar alerta")
  )
}

export function isConfirmationOrCancellationMessage(userMessage: string): boolean {
  const normalized = normalizeText(userMessage)
  return (
    normalized.includes("confirmar") ||
    normalized.includes("pode confirmar") ||
    normalized.includes("cancelar") ||
    normalized.includes("nao atualizar dados do paciente") ||
    normalized.includes("não atualizar dados do paciente") ||
    normalized.includes("manter valores anteriores") ||
    normalized.includes("manter dados anteriores") ||
    normalized.includes("nao armazenar alerta") ||
    normalized.includes("não armazenar alerta") ||
    normalized.includes("salvar alerta para resumo e relatorio") ||
    normalized.includes("salvar alerta")
  )
}

export function isCancelPendingFlowMessage(userMessage: string): boolean {
  const normalized = normalizeText(userMessage)
  return (
    normalized.includes("cancelar acao") ||
    normalized.includes("cancelar ação") ||
    normalized.trim() === "cancelar"
  )
}

export function isQueueControlMessage(userMessage: string): boolean {
  const normalized = normalizeText(userMessage).trim()
  if (normalized.includes("confirmar") || normalized.includes("cancelar")) return true
  if (normalized.includes("manter valores anteriores") || normalized.includes("manter dados anteriores")) return true
  if (normalized.includes("usar novos dados antropometricos")) return true
  if (
    normalized.includes("salvar alerta para resumo e relatorio") ||
    normalized.includes("salvar alerta para resumo e relatório")
  ) return true
  if (normalized.includes("nao armazenar alerta") || normalized.includes("não armazenar alerta")) return true
  if (
    normalized.includes("nao atualizar dados do paciente") ||
    normalized.includes("não atualizar dados do paciente")
  ) return true
  return false
}

export function isLikelyVaccineOrientationMessage(userMessage: string): boolean {
  const normalized = normalizeText(userMessage)
  if (/^orientacoes\s*:/.test(normalized) || /^orientacao\s*:/.test(normalized)) return true
  const hasOrientation = /\borientac(oes|ao)\b/.test(normalized)
  const hasVaccine =
    /\b(vacinas?|vacinacao|imuniz|calendario|pentavalente|hexavalente|pneumococica|rotavirus|\bvip\b|bcg|nirsevimabe)\b/.test(normalized)
  if (hasOrientation && hasVaccine) return true
  if (/\bvacinas?\s+de\s+/.test(normalized) && hasVaccine) return true
  return false
}

export function isPatientDataAccessQuestion(userMessage: string): boolean {
  const normalized = normalizeText(userMessage)
  const asksData =
    normalized.includes("quais dados do paciente") ||
    (normalized.includes("dados do paciente") && normalized.includes("tem acesso")) ||
    (normalized.includes("dados disponiveis") && normalized.includes("paciente"))
  const asksAccess =
    normalized.includes("tem acesso") || normalized.includes("possui acesso") || normalized.includes("acesso")
  return asksData && asksAccess
}

export function messageRequestsBmi(userMessage: string): boolean {
  const normalized = normalizeText(userMessage)
  return (
    normalized.includes("/imc") ||
    normalized.includes("calcular imc") ||
    /\bimc\b/.test(normalized) ||
    /\bindice\s+de\s+massa(\s+corporal)?\b/.test(normalized)
  )
}

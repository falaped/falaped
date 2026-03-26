import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import { normalizeText, normalizeForNearDuplicate } from "@/modules/falaped-assistant/lib/normalize-text"
import { messageRequestsBmi, isLikelyDictationMessage } from "@/modules/falaped-assistant/lib/message-classification"
import { listRecentAssistantReplies } from "@/modules/falaped-assistant/lib/thread-scanning"
import { stripImcCalculationTemplatePrefix } from "@/lib/strip-imc-calculation-template-prefix"

type AcknowledgementTopic =
  | "anamnese"
  | "exame"
  | "exames_lab"
  | "hipoteses"
  | "conduta"
  | "orientacoes"
  | "registro"

export function areNearDuplicateReplies(candidate: string, previous: string): boolean {
  const a = normalizeForNearDuplicate(candidate)
  const b = normalizeForNearDuplicate(previous)
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 24 && b.includes(a)) return true
  if (b.length >= 24 && a.includes(b)) return true
  return false
}

export function isReplyEchoingUserMessage(reply: string, userMessage: string): boolean {
  const replyNormalized = normalizeForNearDuplicate(reply)
  const userNormalized = normalizeForNearDuplicate(userMessage)
  if (!replyNormalized || !userNormalized) return false
  if (replyNormalized === userNormalized) return true
  if (replyNormalized.length >= 24 && userNormalized.includes(replyNormalized)) return true
  if (userNormalized.length >= 24 && replyNormalized.includes(userNormalized)) return true
  return false
}

export function isDryAcknowledgementReply(reply: string): boolean {
  const normalized = normalizeText(reply).replace(/\s+/g, " ")
  return (
    normalized === "registrado." ||
    normalized === "anotado." ||
    normalized === "recebido." ||
    normalized === "prosseguindo." ||
    normalized === "registro realizado com sucesso." ||
    normalized === "anotacao clinica registrada no caso."
  )
}

export function detectAcknowledgementTopic(userMessage: string): AcknowledgementTopic {
  const n = normalizeText(userMessage)

  if (
    /\b(laboratorial|hemograma|hemogram|leucocit|neutrofil|pcr\b|gasometria|exames?\s+labor|urina\s+tipo|urocultura)\b/.test(n)
  ) {
    return "exames_lab"
  }
  if (/\bhipotese\b|\bhipoteses\b|\bdiagnostic/.test(n)) return "hipoteses"
  if (
    /\borientacoes?\b/.test(n) &&
    /\b(vacina|sus|particular|responsavel|engasg|amament|aleitamento)\b/.test(n)
  ) {
    return "orientacoes"
  }
  if (
    /\b(conduta|prescrev|monitorar|manter|avaliar necessidade|iniciar|inicio|ajustar)\b/.test(n)
  ) {
    return "conduta"
  }
  if (
    /\b(exame|acv|abd|ar:|neurologic|ortolani|barlow|fontanela|murmurio|bulhas)\b/.test(n)
  ) {
    return "exame"
  }
  if (
    /\b(anamnese|historic|gestacao|nascimento|familia|queixa principal|episodio|fungor|nasal|sintoma|triagem)\b/.test(n)
  ) {
    return "anamnese"
  }
  return "registro"
}

export function topicAcknowledgementTemplates(topic: AcknowledgementTopic): string[] {
  if (topic === "anamnese") {
    return [
      "Anamnese registrada com sucesso.",
      "Perfeito, histórico clínico anotado. Pode seguir com exame quando desejar.",
      "Registro concluído para anamnese. Quer um resumo parcial até aqui?",
    ]
  }
  if (topic === "exame") {
    return [
      "Exame físico registrado no caso.",
      "Perfeito, achados de exame anotados. Pode seguir com hipóteses e conduta.",
      "Exame documentado com sucesso. Se quiser, eu organizo um resumo parcial.",
    ]
  }
  if (topic === "exames_lab") {
    return [
      "Exames laboratoriais registrados no caso.",
      "Resultados de laboratório anotados. Quando quiser, posso ajudar a amarrar com a conduta.",
      "Registro laboratorial salvo no prontuário deste atendimento.",
    ]
  }
  if (topic === "hipoteses") {
    return [
      "Hipóteses diagnósticas registradas.",
      "Perfeito, hipóteses anotadas no prontuário do caso.",
      "Hipóteses registradas. Quer que eu já consolide conduta e orientações em seguida?",
    ]
  }
  if (topic === "conduta") {
    return [
      "Conduta registrada com sucesso.",
      "Perfeito, conduta anotada no caso.",
      "Conduta registrada. Se quiser, eu já preparo um resumo final do atendimento.",
    ]
  }
  if (topic === "orientacoes") {
    return [
      "Orientações registradas no caso.",
      "Perfeito, orientações ao responsável anotadas com sucesso.",
      "Orientações registradas. Quer que eu resuma os pontos para o responsável?",
    ]
  }
  return [
    "Anotação clínica registrada no caso.",
    "Perfeito, atualização clínica salva no prontuário.",
    "Registro clínico concluído. Se quiser, eu organizo um resumo parcial.",
  ]
}

export function buildDeterministicAcknowledgement(
  userMessage: string,
  messages: CaseMessage[],
): string {
  const topic = detectAcknowledgementTopic(userMessage)
  const templates = topicAcknowledgementTemplates(topic)
  const recentReplies = listRecentAssistantReplies(messages, 2)

  for (const template of templates) {
    const repeats = recentReplies.some((previous) =>
      areNearDuplicateReplies(template, previous),
    )
    if (!repeats) return template
  }

  return templates[0]
}

export function enforceReplyVariation(
  userMessage: string,
  reply: string,
  messages: CaseMessage[],
): string {
  const recentReplies = listRecentAssistantReplies(messages, 2)
  const isRepeated = recentReplies.some((previous) =>
    areNearDuplicateReplies(reply, previous),
  )
  if (!isRepeated) return reply
  if (!isLikelyDictationMessage(userMessage)) return reply
  return buildDeterministicAcknowledgement(userMessage, messages)
}

export function refineChatReplyAfterModel(userMessage: string, reply: string): string {
  if (messageRequestsBmi(userMessage)) return reply
  return stripImcCalculationTemplatePrefix(reply)
}

function replyStartsWithBmiBlock(reply: string): boolean {
  return /^IMC estimado:/i.test(reply.trim())
}

export function needsAntiBmiEchoRecovery(userMessage: string, reply: string): boolean {
  if (messageRequestsBmi(userMessage)) return false
  const trimmed = reply.trim()
  if (trimmed.length === 0) return true
  if (replyStartsWithBmiBlock(trimmed)) return true
  return false
}

export function vaccineReplyHasCondutaLead(reply: string): boolean {
  const t = reply.trim()
  if (t.length === 0) return false
  return /^\s*CONDUTA\s*:/i.test(t)
}

export function vaccineReplyViolatesCondutaOnly(reply: string): boolean {
  if (reply.trim().length === 0) return true
  return !vaccineReplyHasCondutaLead(reply)
}

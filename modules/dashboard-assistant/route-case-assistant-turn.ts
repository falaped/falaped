import type { CaseMessage } from "@/modules/cases/get-case-by-id"
import {
  computePediatricBmi,
  parseWeightHeightForBmi,
} from "@/lib/parse-anthropometrics-for-bmi"
import { stripImcCalculationTemplatePrefix } from "@/lib/strip-imc-calculation-template-prefix"
import { assistantMessageToModelText } from "@/modules/dashboard-assistant/assistant-model-message"
import {
  generateAssistantCaseChat,
  generateCaseClinicalSummary,
  generateGuardianQuestionSuggestions,
  type ClinicalSyncMode,
} from "@/modules/groq/assistant-case-chat"

export type DashboardAssistantIntent =
  | "CHAT"
  | "SUMMARY"
  | "CALCULATE_BMI"
  | "SUGGEST_GUARDIAN_QUESTIONS"
  | "GENERATE_REPORT"
  | "GENERATE_MEDICAL_CERTIFICATE"
  | "GENERATE_PRESCRIPTION"
  | "CLOSE_CASE"

export type AssistantAction =
  | "none"
  | "confirm_close_case"
  | "confirm_generate_report"
  | "confirm_generate_medical_certificate"
  | "confirm_generate_prescription"

export type StoredDataItem = {
  section: "CONDUTA" | "DADOS_ANTROPOMETRICOS"
  label: string
  value: string
  status: "confirmado" | "pendente_de_confirmacao"
}

export type RoutedAssistantTurn = {
  intent: DashboardAssistantIntent
  reply: string
  action: AssistantAction
  showStructuredCard: boolean
  showAlert: boolean
  storedData: StoredDataItem[]
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

/** Same criteria as CALCULATE_BMI intent (user explicitly asked for BMI this turn). */
function messageRequestsBmi(userMessage: string): boolean {
  const n = normalizeText(userMessage)
  return (
    n.includes("/imc") ||
    n.includes("calcular imc") ||
    /\bimc\b/.test(n) ||
    /\bindice\s+de\s+massa(\s+corporal)?\b/.test(n)
  )
}

function replyStartsWithBmiBlock(reply: string): boolean {
  return /^IMC estimado:/i.test(reply.trim())
}

function refineChatReplyAfterModel(userMessage: string, reply: string): string {
  if (messageRequestsBmi(userMessage)) return reply
  return stripImcCalculationTemplatePrefix(reply)
}

/** User dictation that should get CONDUTA on vaccines, not IMC echo or empty strip. */
function isLikelyVaccineOrientationMessage(userMessage: string): boolean {
  const n = normalizeText(userMessage)
  if (/^orientacoes\s*:/.test(n) || /^orientacao\s*:/.test(n)) return true
  const hasOrientation = /\borientac(oes|ao)\b/.test(n)
  const hasVaccine =
    /\b(vacinas?|vacinacao|imuniz|calendario|pentavalente|hexavalente|pneumococica|rotavirus|\bvip\b|bcg|nirsevimabe)\b/.test(
      n,
    )
  if (hasOrientation && hasVaccine) return true
  if (/\bvacinas?\s+de\s+/.test(n) && hasVaccine) return true
  return false
}

function needsAntiBmiEchoRecovery(userMessage: string, reply: string): boolean {
  if (messageRequestsBmi(userMessage)) return false
  const trimmed = reply.trim()
  if (trimmed.length === 0) return true
  if (replyStartsWithBmiBlock(trimmed)) return true
  return false
}

function vaccineReplyHasCondutaLead(reply: string): boolean {
  const t = reply.trim()
  if (t.length === 0) return false
  return /^\s*CONDUTA\s*:/i.test(t)
}

/** On vaccine-only path, accept only a CONDUTA-led reply (no ANAMNESE dump, no plain filler). */
function vaccineReplyViolatesCondutaOnly(reply: string): boolean {
  if (reply.trim().length === 0) return true
  return !vaccineReplyHasCondutaLead(reply)
}

/** Scopes structured clinical blocks: last user turn only vs full thread consolidation. */
function resolveClinicalSyncMode(userMessage: string): ClinicalSyncMode {
  const n = normalizeText(userMessage)
  if (
    /\bresumo\s+global\b/.test(n) ||
    /\bvisao\s+geral\b/.test(n) ||
    /\bconsolidar\b.*\batendimento\b/.test(n) ||
    /\batualizar\s+resumo\b/.test(n) ||
    /\bsintese\s+do\s+caso\b/.test(n) ||
    /\bpanorama\s+clinico\b/.test(n)
  ) {
    return "global_update"
  }
  if (/\bhipotese/.test(n) || /\bhipoteses\b/.test(n)) {
    return "single_turn"
  }
  if (userMessage.length < 2400) {
    return "single_turn"
  }
  return "balanced"
}

export function detectDashboardAssistantIntent(message: string): DashboardAssistantIntent {
  const normalized = normalizeText(message)

  if (normalized.includes("/resumo") || normalized.includes("resumir principais pontos")) {
    return "SUMMARY"
  }
  if (
    normalized.includes("/imc") ||
    normalized.includes("calcular imc") ||
    /\bimc\b/.test(normalized) ||
    /\bindice\s+de\s+massa(\s+corporal)?\b/.test(normalized)
  ) {
    return "CALCULATE_BMI"
  }
  if (
    normalized.includes("sugerir perguntas para o responsavel") ||
    normalized.includes("sugererir perguntas ao responsavel") ||
    normalized.includes("sugerir perguntas ao responsavel")
  ) {
    return "SUGGEST_GUARDIAN_QUESTIONS"
  }
  if (normalized.includes("/relatorio") || normalized.includes("gerar relatorio")) {
    return "GENERATE_REPORT"
  }
  if (normalized.includes("/atestado") || normalized.includes("gerar atestado")) {
    return "GENERATE_MEDICAL_CERTIFICATE"
  }
  if (normalized.includes("/receita") || normalized.includes("gerar receita")) {
    return "GENERATE_PRESCRIPTION"
  }
  if (
    normalized.includes("/encerrar") ||
    normalized.includes("encerrar caso") ||
    normalized.includes("fechar caso")
  ) {
    return "CLOSE_CASE"
  }

  return "CHAT"
}

function isCommandLikeMessage(content: string): boolean {
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
    normalized.includes("cancelar acao") ||
    normalized.includes("cancelar ação")
  )
}

function substantiveUserMessageCount(messages: CaseMessage[]): number {
  return messages.filter(
    (message) => message.role === "user" && !isCommandLikeMessage(message.content),
  ).length
}

function buildThreadTextForAuxiliaryModel(messages: CaseMessage[]): string {
  const lines: string[] = []
  for (const message of messages) {
    if (message.role === "user" && isCommandLikeMessage(message.content)) {
      continue
    }
    const label = message.role === "user" ? "Médico" : "Falaped"
    const body =
      message.role === "assistant"
        ? assistantMessageToModelText(message.content)
        : message.content.trim()
    if (body.length > 0) {
      lines.push(`${label}: ${body}`)
    }
  }
  const joined = lines.join("\n\n")
  return joined.length > 14_000 ? joined.slice(-14_000) : joined
}

function extractStoredData(message: string): StoredDataItem[] {
  const data: StoredDataItem[] = []
  const normalized = normalizeText(message).replace(",", ".")

  if (normalized.includes("conduta")) {
    data.push({
      section: "CONDUTA",
      label: "Conduta informada",
      value: message.trim(),
      status: "confirmado",
    })
  }

  const parsed = parseWeightHeightForBmi(message)
  if (parsed.weightKg) {
    data.push({
      section: "DADOS_ANTROPOMETRICOS",
      label: "Peso",
      value: `${parsed.weightKg.toFixed(3).replace(/\.?0+$/, "")} kg`,
      status: "confirmado",
    })
  }
  if (parsed.heightM) {
    data.push({
      section: "DADOS_ANTROPOMETRICOS",
      label: "Comprimento / altura",
      value: `${(parsed.heightM * 100).toFixed(1)} cm`,
      status: "confirmado",
    })
  }

  if (parsed.weightKg && parsed.heightM) {
    const bmiResult = computePediatricBmi(parsed.weightKg, parsed.heightM)
    if (bmiResult.ok) {
      data.push({
        section: "DADOS_ANTROPOMETRICOS",
        label: "IMC estimado",
        value: bmiResult.bmi.toFixed(1),
        status: "pendente_de_confirmacao",
      })
    }
  }

  return data
}

export async function routeDashboardCaseAssistantTurn(params: {
  userMessage: string
  messages: CaseMessage[]
  pendingAction: string | null
  patientContext: string | null
  conversationSummary: string | null
  patientMetrics?: { weight: number | null; height: number | null }
}): Promise<RoutedAssistantTurn> {
  const intent = detectDashboardAssistantIntent(params.userMessage)
  const normalized = normalizeText(params.userMessage)
  const confirmsReport = normalized.includes("confirmar geracao de relatorio")
  const confirmsMedicalCertificate = normalized.includes(
    "confirmar geracao de atestado",
  )
  const confirmsPrescription = normalized.includes("confirmar geracao de receita")
  const cancelsAction =
    normalized.includes("cancelar acao") ||
    normalized.includes("cancelar ação") ||
    normalized === "cancelar"

  const confirms = [
    "confirmar",
    "sim, confirmar",
    "sim",
    "pode confirmar",
    "confirmar encerramento",
    "confirmar geracao",
  ]
  const userConfirmed = confirms.some((term) => normalized.includes(term))

  if (cancelsAction) {
    return {
      intent: "CHAT",
      reply: "Ação cancelada. Pode continuar o registro clínico quando desejar.",
      action: "none",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (params.pendingAction === "close_case" && userConfirmed) {
    return {
      intent: "CLOSE_CASE",
      reply: "Confirmação recebida. Vou encerrar o caso agora.",
      action: "confirm_close_case",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (params.pendingAction === "generate_report" && userConfirmed) {
    return {
      intent: "GENERATE_REPORT",
      reply: "Confirmação recebida. Vou gerar o relatório deste caso agora.",
      action: "confirm_generate_report",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (params.pendingAction === "generate_medical_certificate" && userConfirmed) {
    return {
      intent: "GENERATE_MEDICAL_CERTIFICATE",
      reply: "Confirmação recebida. Vou iniciar a geração do atestado.",
      action: "confirm_generate_medical_certificate",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (params.pendingAction === "generate_prescription" && userConfirmed) {
    return {
      intent: "GENERATE_PRESCRIPTION",
      reply: "Confirmação recebida. Vou iniciar a geração da receita.",
      action: "confirm_generate_prescription",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (confirmsReport) {
    return {
      intent: "GENERATE_REPORT",
      reply: "Confirmação recebida. Vou gerar o relatório deste caso agora.",
      action: "confirm_generate_report",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (confirmsMedicalCertificate) {
    return {
      intent: "GENERATE_MEDICAL_CERTIFICATE",
      reply: "Confirmação recebida. Vou iniciar a geração do atestado.",
      action: "confirm_generate_medical_certificate",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (confirmsPrescription) {
    return {
      intent: "GENERATE_PRESCRIPTION",
      reply: "Confirmação recebida. Vou iniciar a geração da receita.",
      action: "confirm_generate_prescription",
      showStructuredCard: false,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "CLOSE_CASE") {
    return {
      intent,
      reply: "Para encerrar com segurança, confirme a intenção e depois a execução.",
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "GENERATE_REPORT") {
    return {
      intent,
      reply:
        "Posso gerar o relatório no thread deste caso. Confirme para continuar com a geração.",
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "GENERATE_MEDICAL_CERTIFICATE") {
    return {
      intent,
      reply:
        "Posso iniciar a geração do atestado com os dados atuais do caso. Confirme para continuar.",
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "GENERATE_PRESCRIPTION") {
    return {
      intent,
      reply:
        "Posso iniciar a geração da receita com os dados clínicos atuais. Confirme para continuar.",
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "SUMMARY") {
    if (substantiveUserMessageCount(params.messages) === 0) {
      return {
        intent,
        reply:
          "Ainda não há conteúdo clínico suficiente para resumo. Registre sintomas, exame físico e conduta para continuar.",
        action: "none",
        showStructuredCard: false,
        showAlert: false,
        storedData: [],
      }
    }

    const threadText = buildThreadTextForAuxiliaryModel(params.messages)
    const summaryReply = await generateCaseClinicalSummary({
      clinicalThreadText: threadText,
      conversationSummary: params.conversationSummary,
    })

    return {
      intent,
      reply: summaryReply,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "SUGGEST_GUARDIAN_QUESTIONS") {
    const threadText = buildThreadTextForAuxiliaryModel(params.messages)
    const guardianReply = await generateGuardianQuestionSuggestions({
      clinicalThreadText: threadText,
      conversationSummary: params.conversationSummary,
    })
    const replyText = guardianReply.trim().startsWith("Sugestões para o responsável")
      ? guardianReply
      : `Sugestões para o responsável:\n${guardianReply}`

    return {
      intent,
      reply: replyText,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: [],
    }
  }

  if (intent === "CALCULATE_BMI") {
    const parsed = parseWeightHeightForBmi(params.userMessage)
    const weight = parsed.weightKg ?? params.patientMetrics?.weight ?? null
    const height = parsed.heightM ?? params.patientMetrics?.height ?? null

    if (!weight || !height) {
      return {
        intent,
        reply:
          "Para calcular IMC, preciso de peso (kg) e comprimento ou altura (cm) na mensagem ou no cadastro. Use rótulos claros (ex.: peso 3,45 kg, comprimento 51,5 cm).",
        action: "none",
        showStructuredCard: false,
        showAlert: false,
        storedData: [],
      }
    }

    const bmiResult = computePediatricBmi(weight, height)
    if (!bmiResult.ok) {
      return {
        intent,
        reply: bmiResult.reason,
        action: "none",
        showStructuredCard: true,
        showAlert: false,
        storedData: extractStoredData(params.userMessage),
      }
    }

    const heightMetersRounded = height.toFixed(3)
    const heightSquared = (height * height).toFixed(5)
    const weightRounded = weight.toFixed(3)
    const heightCmDisplay = (height * 100).toFixed(1)
    const reply = [
      `IMC estimado: ${bmiResult.bmi.toFixed(1)}.`,
      `Fórmula: peso (kg) ÷ altura (m)².`,
      `Conta: ${weightRounded} kg ÷ (${heightMetersRounded} m)² = ${weightRounded} ÷ ${heightSquared} ≈ ${bmiResult.bmi.toFixed(1)}.`,
      `Dados utilizados neste cálculo: peso ${weightRounded} kg e comprimento/altura ${heightCmDisplay} cm (altura em metros: ${heightMetersRounded} m).`,
      "Confirme se esses valores estão corretos antes de registrar.",
    ].join("\n\n")

    return {
      intent,
      reply,
      action: "none",
      showStructuredCard: true,
      showAlert: false,
      storedData: extractStoredData(params.userMessage),
    }
  }

  const mappedMessages = params.messages.map((message) => ({
    role: message.role,
    content:
      message.role === "assistant"
        ? assistantMessageToModelText(message.content)
        : message.content,
  }))

  const lastMessage = params.messages[params.messages.length - 1]
  const endsWithSameUser =
    lastMessage?.role === "user" &&
    lastMessage.content.trim() === params.userMessage.trim()

  const messagesForModel = endsWithSameUser
    ? mappedMessages
    : [...mappedMessages, { role: "user" as const, content: params.userMessage }]

  const clinicalSyncMode = resolveClinicalSyncMode(params.userMessage)

  /** Avoid ANAMNESE/EXAME/IMC echo from long thread after a prior IMC turn. */
  const vaccineOnlyMessages = [
    { role: "user" as const, content: params.userMessage },
  ]

  let reply: string
  if (isLikelyVaccineOrientationMessage(params.userMessage)) {
    reply = await generateAssistantCaseChat({
      patientContext: params.patientContext,
      conversationSummary: params.conversationSummary,
      messages: vaccineOnlyMessages,
      clinicalSyncMode: "single_turn",
      forbidBmiInReply: true,
      focusedAcknowledgement: "vaccine_orientation",
    })
    reply = refineChatReplyAfterModel(params.userMessage, reply)

    if (
      needsAntiBmiEchoRecovery(params.userMessage, reply) ||
      vaccineReplyViolatesCondutaOnly(reply)
    ) {
      reply = await generateAssistantCaseChat({
        patientContext: params.patientContext,
        conversationSummary: params.conversationSummary,
        messages: vaccineOnlyMessages,
        clinicalSyncMode: "single_turn",
        forbidBmiInReply: true,
        focusedAcknowledgement: "vaccine_orientation",
      })
      reply = refineChatReplyAfterModel(params.userMessage, reply)
    }

    if (
      needsAntiBmiEchoRecovery(params.userMessage, reply) ||
      vaccineReplyViolatesCondutaOnly(reply)
    ) {
      reply = await generateAssistantCaseChat({
        patientContext: params.patientContext,
        conversationSummary: params.conversationSummary,
        messages: vaccineOnlyMessages,
        clinicalSyncMode: "single_turn",
        forbidBmiInReply: true,
        focusedAcknowledgement: "vaccine_orientation",
      })
      reply = refineChatReplyAfterModel(params.userMessage, reply)
    }

    if (
      needsAntiBmiEchoRecovery(params.userMessage, reply) ||
      vaccineReplyViolatesCondutaOnly(reply)
    ) {
      reply =
        "CONDUTA: Orientações de vacinação registradas (SUS e particular conforme o texto enviado). Confira calendário local e idade da criança para datas de doses."
    }
  } else {
    reply = await generateAssistantCaseChat({
      patientContext: params.patientContext,
      conversationSummary: params.conversationSummary,
      messages: messagesForModel,
      clinicalSyncMode,
    })
    reply = refineChatReplyAfterModel(params.userMessage, reply)

    if (needsAntiBmiEchoRecovery(params.userMessage, reply)) {
      reply = await generateAssistantCaseChat({
        patientContext: params.patientContext,
        conversationSummary: params.conversationSummary,
        messages: messagesForModel,
        clinicalSyncMode,
        forbidBmiInReply: true,
      })
      reply = refineChatReplyAfterModel(params.userMessage, reply)
    }

    if (needsAntiBmiEchoRecovery(params.userMessage, reply)) {
      reply =
        "CONDUTA: Registro recebido. Revise o texto enviado para os detalhes; IMC não foi solicitado neste turno."
    }
  }

  const showAlert = /alerta|urgencia|gravidade|risco/.test(normalized)
  const storedData = extractStoredData(params.userMessage)
  const showStructuredCard =
    storedData.length >= 2 ||
    /analise|resumo|conduta|exame|anamnese|hipotese|hipoteses/.test(normalized)

  return {
    intent,
    reply,
    action: "none",
    showStructuredCard,
    showAlert,
    storedData,
  }
}


"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  ASSISTANT_CASE_CHAT_MAX_HISTORY_CHARS,
  ASSISTANT_CASE_CHAT_MAX_HISTORY_MESSAGES,
  CASE_CHAT_SUBSTANTIVE_USER_MESSAGE_MIN_CHARS,
} from "@/lib/constants"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getCaseRowForProfile } from "@/modules/cases/get-case-row-for-profile"
import { getCaseById } from "@/modules/cases/get-case-by-id"
import { listCaseMessagesByCaseId } from "@/modules/case-messages/list-case-messages-by-case-id"
import { insertCaseMessage } from "@/modules/case-messages/insert-case-message"
import { routeDashboardCaseAssistantTurn } from "@/modules/dashboard-assistant/route-case-assistant-turn"
import { updateCasePendingAction } from "@/modules/cases/update-case-pending-action"
import { updateCaseStatusAction } from "@/actions/cases/update-case-status"
import { generateCaseReportAction } from "@/actions/cases/generate-case-report"
import { updateCaseDashboardChatContextSummary } from "@/modules/cases/update-case-dashboard-chat-context-summary"
import { stripAssistantUiLabelsFromReply } from "@/lib/format-clinical-assistant-sections"

const PAYLOAD_PREFIX = "__FALAPED_JSON__"

type AssistantActionId =
  | "confirm_close_case"
  | "confirm_generate_report"
  | "confirm_generate_medical_certificate"
  | "confirm_generate_prescription"
  | "cancel_pending_action"

type AssistantStoredData = {
  section: string
  label: string
  value: string
  status: "confirmado" | "pendente_de_confirmacao"
}

type AssistantPayload = {
  type: "assistant_reply" | "assistant_report_file"
  title?: string
  content: string
  /** @deprecated Legacy payloads only; new replies use full text in `content`. */
  structuredClinicalNote?: string
  showAlertCompact?: boolean
  actions?: Array<{ id: AssistantActionId; label: string }>
  reportId?: string
  reportFileName?: string
  storedData?: {
    collapsedByDefault: boolean
    items: AssistantStoredData[]
  }
}

function serializeAssistantPayload(payload: AssistantPayload): string {
  return `${PAYLOAD_PREFIX}${JSON.stringify(payload)}`
}

function hasMinimumConversationForReport(messages: Array<{ role: "user" | "assistant"; content: string }>): boolean {
  const userMessages = messages.filter((message) => message.role === "user")
  const commandRegex =
    /(\/resumo|\/imc|\/relatorio|\/encerrar|\/atestado|\/receita|resumir principais pontos|calcular imc|gerar relatorio|encerrar caso|gerar atestado|gerar receita)/i

  const substantiveMessages = userMessages.filter((message) => {
    const text = message.content.trim()
    return (
      text.length >= CASE_CHAT_SUBSTANTIVE_USER_MESSAGE_MIN_CHARS &&
      !commandRegex.test(text)
    )
  })

  return substantiveMessages.length >= 2
}

function buildPatientContext(caseRow: { patient_id: string | null }): string | null {
  if (!caseRow.patient_id) {
    return "Paciente ainda não associado."
  }
  return `Paciente associado ao caso: ${caseRow.patient_id}`
}

function parseMetricToNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const normalized = value.toLowerCase().replace(",", ".")
  const match = normalized.match(/(\d{1,3}(?:\.\d+)?)/)
  if (!match) return null
  return Number(match[1])
}

function truncateConversationWindow(messages: Array<{ role: "user" | "assistant"; content: string }>): {
  trimmed: Array<{ role: "user" | "assistant"; content: string }>
  droppedCount: number
} {
  const latest = messages.slice(-ASSISTANT_CASE_CHAT_MAX_HISTORY_MESSAGES)
  let totalChars = latest.reduce((sum, message) => sum + message.content.length, 0)
  let startIndex = 0

  while (totalChars > ASSISTANT_CASE_CHAT_MAX_HISTORY_CHARS && startIndex < latest.length - 1) {
    totalChars -= latest[startIndex].content.length
    startIndex += 1
  }

  const trimmed = latest.slice(startIndex)
  const droppedCount = messages.length - trimmed.length
  return { trimmed, droppedCount }
}

function buildAssistantActionsFromPendingAction(
  pendingAction: string,
): Array<{ id: AssistantActionId; label: string }> {
  if (pendingAction === "close_case") {
    return [
      { id: "confirm_close_case", label: "Confirmar encerramento" },
      { id: "cancel_pending_action", label: "Cancelar ação" },
    ]
  }

  if (pendingAction === "generate_report") {
    return [
      { id: "confirm_generate_report", label: "Confirmar geração de relatório" },
      { id: "cancel_pending_action", label: "Cancelar ação" },
    ]
  }

  if (pendingAction === "generate_medical_certificate") {
    return [
      {
        id: "confirm_generate_medical_certificate",
        label: "Confirmar geração de atestado",
      },
      { id: "cancel_pending_action", label: "Cancelar ação" },
    ]
  }

  return [
    { id: "confirm_generate_prescription", label: "Confirmar geração de receita" },
    { id: "cancel_pending_action", label: "Cancelar ação" },
  ]
}

export type SendCaseAssistantMessageActionResult =
  | {
    ok: true
    userMessage: { id: string; role: "user"; content: string; created_at: string }
    assistantMessage: { id: string; role: "assistant"; content: string; created_at: string }
    reportId?: string
  }
  | { ok: false; error: string }

export async function sendCaseAssistantMessageAction(
  caseId: string,
  userInput: string,
): Promise<SendCaseAssistantMessageActionResult> {
  const content = userInput.trim()
  if (!content) return { ok: false, error: "Digite uma mensagem para enviar." }

  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) return { ok: false, error: "Sessão não encontrada." }
  if (profile.status !== "paid") {
    return { ok: false, error: "Perfil não ativo. Conecte seu WhatsApp para continuar." }
  }

  const caseRow = await getCaseRowForProfile(supabase, caseId, profile.id)
  if (!caseRow) {
    return { ok: false, error: "Caso não encontrado." }
  }

  if (caseRow.status !== "active" || caseRow.origin !== "dashboard") {
    return { ok: false, error: "Somente casos ativos do painel aceitam novas mensagens." }
  }

  try {
    if (
      caseRow.pending_action &&
      /cancelar acao|cancelar ação|cancelar/.test(content.toLowerCase())
    ) {
      await updateCasePendingAction(supabase, caseId, profile.id, null)
    }

    const insertedUserMessage = await insertCaseMessage(supabase, {
      caseId,
      role: "user",
      content,
    })

    const threadMessages = await listCaseMessagesByCaseId(supabase, caseId)
    const caseDetail = await getCaseById(supabase, caseId, profile.id)
    const normalizedMessages = threadMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }))

    const { trimmed, droppedCount } = truncateConversationWindow(normalizedMessages)
    if (droppedCount > 3) {
      const summaryText = trimmed
        .slice(0, 5)
        .map((message) => `${message.role === "user" ? "Médico" : "Falaped"}: ${message.content}`)
        .join(" | ")
      await updateCaseDashboardChatContextSummary(supabase, caseId, profile.id, summaryText)
    }

    const routed = await routeDashboardCaseAssistantTurn({
      userMessage: content,
      messages: threadMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at,
      })),
      pendingAction: caseRow.pending_action,
      patientContext: buildPatientContext(caseRow),
      conversationSummary: caseRow.dashboard_chat_context_summary,
      patientMetrics: {
        weight: parseMetricToNumber(caseDetail?.patient?.weight),
        height: (() => {
          const parsed = parseMetricToNumber(caseDetail?.patient?.height)
          if (!parsed) return null
          return parsed > 3 ? parsed / 100 : parsed
        })(),
      },
    })

    let reportId: string | undefined
    const reportHasMinimumData = hasMinimumConversationForReport(normalizedMessages)

    if (routed.action === "confirm_close_case") {
      await updateCasePendingAction(supabase, caseId, profile.id, null)
      const closed = await updateCaseStatusAction(caseId, "closed")
      if (!closed.ok) return { ok: false, error: closed.error }
    }

    if (routed.action === "confirm_generate_report") {
      if (!reportHasMinimumData) {
        return {
          ok: false,
          error:
            "É preciso registrar mais informações clínicas neste caso antes de gerar o relatório. Continue o atendimento e tente novamente.",
        }
      }
      const generated = await generateCaseReportAction(caseId)
      if (!generated.ok) return { ok: false, error: generated.error }
      reportId = generated.reportId
    }

    if (routed.action === "confirm_generate_medical_certificate") {
      // Placeholder for future certificate generation flow confirmation.
    }
    if (routed.action === "confirm_generate_prescription") {
      // Placeholder for future prescription generation flow confirmation.
    }

    if (routed.action === "none") {
      if (routed.intent === "CLOSE_CASE") {
        await updateCasePendingAction(supabase, caseId, profile.id, "close_case")
      }
    }

    const pendingActionForButtons =
      routed.intent === "CLOSE_CASE"
        ? "close_case"
        : routed.intent === "GENERATE_REPORT"
          ? reportHasMinimumData
            ? "generate_report"
            : null
          : routed.intent === "GENERATE_MEDICAL_CERTIFICATE"
            ? "generate_medical_certificate"
            : routed.intent === "GENERATE_PRESCRIPTION"
              ? "generate_prescription"
              : null

    const isReportInsufficientGate =
      routed.intent === "GENERATE_REPORT" &&
      routed.action === "none" &&
      !reportHasMinimumData

    const assistantReplySanitized = stripAssistantUiLabelsFromReply(routed.reply)

    const replyContent =
      isReportInsufficientGate
        ? "Ainda não há conteúdo clínico suficiente para gerar o relatório. Registre sintomas, exame e conduta para continuar."
        : assistantReplySanitized

    const storedDataPayload =
      routed.storedData.length > 0
        ? {
          collapsedByDefault: true,
          items: routed.storedData.map(
            (item): AssistantStoredData => ({
              section: item.section,
              label: item.label,
              value: item.value,
              status:
                item.status === "confirmado"
                  ? "confirmado"
                  : "pendente_de_confirmacao",
            }),
          ),
        }
        : undefined

    const payload: AssistantPayload =
      reportId
        ? {
          type: "assistant_report_file",
          title: "Relatório disponível para download",
          content:
            "Relatório gerado com base nas informações registradas neste caso.",
          reportId,
          reportFileName: "relatorio-caso.pdf",
        }
        : {
          type: "assistant_reply",
          content: replyContent,
          showAlertCompact: routed.showAlert,
          actions: pendingActionForButtons
            ? buildAssistantActionsFromPendingAction(pendingActionForButtons)
            : undefined,
          storedData: storedDataPayload,
        }

    const assistantContent = serializeAssistantPayload(payload)
    const insertedAssistantMessage = await insertCaseMessage(supabase, {
      caseId,
      role: "assistant",
      content: assistantContent,
    })

    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/new/${caseId}`)

    return {
      ok: true,
      userMessage: {
        id: insertedUserMessage.id,
        role: "user",
        content: insertedUserMessage.content,
        created_at: insertedUserMessage.created_at,
      },
      assistantMessage: {
        id: insertedAssistantMessage.id,
        role: "assistant",
        content: insertedAssistantMessage.content,
        created_at: insertedAssistantMessage.created_at,
      },
      reportId,
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Erro ao enviar mensagem para o Falaped.",
    }
  }
}


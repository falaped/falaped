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
import {
  insertCaseMessage,
  type InsertedCaseMessage,
} from "@/modules/case-messages/insert-case-message"
import { updateCasePendingAction } from "@/modules/cases/update-case-pending-action"
import { updateCaseStatusAction } from "@/actions/cases/update-case-status"
import { generateCaseReportAction } from "@/actions/cases/generate-case-report"
import { updateCaseDashboardChatContextSummary } from "@/modules/cases/update-case-dashboard-chat-context-summary"
import { stripAssistantUiLabelsFromReply } from "@/lib/format-clinical-assistant-sections"
import { polishAssistantReplyForDisplay } from "@/modules/groq/assistant-polish-reply"
import { updatePatient, type UpdatePatientPayload } from "@/modules/patients/update-patient"
import { assistantMessageToModelText } from "@/modules/falaped-assistant/assistant-model-message"
import { getConsultRecords } from "@/modules/cases/get-consult-records"
import { clinicDay, formatConsultRecordsForAi, latestAnthropometry } from "@/lib/consult-records"
import { createMeasurement } from "@/modules/patient-growth/create-measurement"
import { processAssistantTurn } from "@/modules/falaped-assistant/orchestrator/process-turn"
import { updateCaseAssistantTurnQueue } from "@/modules/cases/update-case-assistant-turn-queue"
import { withBlockedAssistantMessageId } from "@/modules/falaped-assistant/pipeline/assistant-turn-queue"

const PAYLOAD_PREFIX = "__FALAPED_JSON__"
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi

type AssistantActionId =
  | "confirm_close_case"
  | "confirm_generate_report"
  | "confirm_generate_medical_certificate"
  | "confirm_generate_prescription"
  | "confirm_update_patient_profile"
  | "decline_update_patient_profile"
  | "confirm_anthropometric_reference"
  | "keep_previous_anthropometric_reference"
  | "confirm_guardian_alert_storage"
  | "decline_guardian_alert_storage"
  | "cancel_pending_action"

type AssistantStoredData = {
  section: string
  label: string
  value: string
  status: "confirmado" | "pendente_de_confirmacao"
}

type AssistantClinicalAlertItem = {
  id: string
  title: string
  detail: string
}

type AssistantPayload = {
  type: "assistant_reply" | "assistant_report_file"
  title?: string
  content: string
  /** @deprecated Legacy payloads only; new replies use full text in `content`. */
  structuredClinicalNote?: string
  showAlertCompact?: boolean
  clinicalAlertItems?: AssistantClinicalAlertItem[]
  actions?: Array<{ id: AssistantActionId; label: string }>
  reportId?: string
  reportFileName?: string
  storedData?: {
    collapsedByDefault: boolean
    items: AssistantStoredData[]
  }
  blockedAssistantMessageId?: string
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

type PatientContextSnapshot = {
  name: string
  birth_date: string | null
  responsible: string | null
  weight: string | null
  height: string | null
  allergies: string | null
  current_medications: string | null
  medical_history: string | null
}

function formatPatientAgeFromBirthDate(birthDate: string | null): string | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years <= 0) {
    return `${Math.max(months, 0)} meses`
  }
  return `${years} anos e ${Math.max(months, 0)} meses`
}

function buildPatientContext(patient: PatientContextSnapshot | null): string | null {
  if (!patient) {
    return "Paciente ainda não associado."
  }

  const parts: string[] = [`Nome: ${patient.name}`]
  const age = formatPatientAgeFromBirthDate(patient.birth_date)
  if (age) parts.push(`Idade: ${age}`)
  if (patient.responsible?.trim()) parts.push(`Responsável: ${patient.responsible.trim()}`)
  if (patient.weight?.trim()) parts.push(`Peso: ${patient.weight.trim()}`)
  if (patient.height?.trim()) parts.push(`Altura/comprimento: ${patient.height.trim()}`)
  if (patient.allergies?.trim()) parts.push(`Alergias: ${patient.allergies.trim()}`)
  if (patient.current_medications?.trim()) parts.push(`Medicações em uso: ${patient.current_medications.trim()}`)
  if (patient.medical_history?.trim()) parts.push(`Histórico: ${patient.medical_history.trim()}`)

  return `Contexto do paciente: ${parts.join(" | ")}`
}

/** Junta o que a consulta já produziu no app ao contexto do paciente. */
function withConsultRecords(patientContext: string | null, records: string | null): string | null {
  if (!records) return patientContext
  return [
    patientContext,
    `Feito nesta consulta pelo app (o médico já gerou ou registrou; considere ao responder e não peça de novo):\n${records}`,
  ]
    .filter(Boolean)
    .join("\n\n")
}

function parseMetricToNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const normalized = value.toLowerCase().replace(",", ".")
  const match = normalized.match(/(\d{1,3}(?:\.\d+)?)/)
  if (!match) return null
  return Number(match[1])
}

/** Grava o peso/estatura confirmados como medida do dia da consulta e devolve a resposta do chat. */
async function saveChatMeasurement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  consult: { started_at: string; patient_id: string | null },
  update: { weightKg: number | null; heightM: number | null } | undefined,
): Promise<string> {
  const weightKg = update?.weightKg != null && update.weightKg >= 0.3 && update.weightKg <= 180 ? update.weightKg : null
  const heightCm = update?.heightM != null && update.heightM * 100 >= 20 && update.heightM * 100 <= 220 ? update.heightM * 100 : null
  if (!consult.patient_id || (weightKg == null && heightCm == null)) {
    return "Não consegui registrar: confira o valor e use o botão Medidas."
  }
  await createMeasurement(supabase, profileId, consult.patient_id, {
    measured_on: clinicDay(consult.started_at),
    weight_grams: weightKg != null ? Math.round(weightKg * 1000) : null,
    length_height_mm: heightCm != null ? Math.round(heightCm * 10) : null,
    head_circumference_mm: null,
    systolic_bp: null,
    diastolic_bp: null,
  })
  revalidatePath(`/dashboard/patients/${consult.patient_id}`)
  const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })
  const parts = [
    weightKg != null ? `peso ${decimal.format(weightKg)} kg` : null,
    heightCm != null ? `estatura ${decimal.format(heightCm)} cm` : null,
  ].filter(Boolean)
  return `Medida registrada na consulta: ${parts.join(", ")}. Já aparece na ficha e na curva de crescimento.`
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

function formatPatientProfileUpdateSuccessReply(
  payload: UpdatePatientPayload,
): string {
  const labelForKey: Partial<Record<keyof UpdatePatientPayload, string>> = {
    name: "nome",
    birth_date: "data de nascimento",
    responsible: "responsável",
    contact_phone: "telefone",
    sex: "sexo",
    legal_guardian: "responsável legal",
    blood_type: "tipo sanguíneo",
    weight: "peso",
    height: "altura",
    head_circumference: "perímetro cefálico",
    allergies: "alergias",
    current_medications: "medicações em uso",
    medical_history: "histórico médico",
  }
  const keys = (Object.keys(payload) as (keyof UpdatePatientPayload)[]).filter(
    (key) => payload[key] !== undefined,
  )
  if (keys.length === 0) return "Perfil do paciente atualizado."
  const parts = keys.map((key) => labelForKey[key] ?? String(key))
  return `Perfil do paciente atualizado: ${parts.join(", ")}.`
}

function sanitizeAssistantReplyForPrivacy(reply: string): string {
  const withoutUuid = reply.replace(UUID_PATTERN, "[identificador interno ocultado]")
  const lines = withoutUuid.split("\n")
  const sanitizedLines = lines.map((line) => {
    const normalized = line
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
    if (/^[-•]\s*paciente\s*:\s*id\b/.test(normalized)) {
      return "• Paciente: identificado no prontuário clínico."
    }
    return line
  })
  return sanitizedLines.join("\n")
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

  if (pendingAction === "review_anthropometric_reference") {
    return [
      {
        id: "confirm_anthropometric_reference",
        label: "Confirmar novos dados antropométricos",
      },
      {
        id: "keep_previous_anthropometric_reference",
        label: "Manter valores anteriores",
      },
    ]
  }

  if (pendingAction === "review_patient_profile_update") {
    return [
      {
        id: "confirm_update_patient_profile",
        label: "Confirmar atualização dos dados do paciente",
      },
      {
        id: "decline_update_patient_profile",
        label: "Não atualizar dados do paciente",
      },
    ]
  }

  if (pendingAction === "review_guardian_alert") {
    return [
      {
        id: "confirm_guardian_alert_storage",
        label: "Salvar alerta para resumo e relatório",
      },
      {
        id: "decline_guardian_alert_storage",
        label: "Não armazenar alerta",
      },
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
    /** Last assistant message (same as the last entry of `assistantMessages`). */
    assistantMessage: InsertedCaseMessage
    /** All assistant segments produced in this request (chained pipeline). */
    assistantMessages: InsertedCaseMessage[]
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
    return { ok: false, error: "Perfil não ativo. Conclua a configuração da conta em Perfil." }
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
    const consultRecords = caseDetail
      ? await getConsultRecords(supabase, profile.id, caseDetail)
      : null
    // Peso, altura e PC vêm das medidas registradas (consulta ou ficha); o campo do
    // cadastro antigo só vale quando não há medida.
    const latest = latestAnthropometry(consultRecords?.patientMeasurements ?? [])
    const patient = caseDetail?.patient
      ? {
          ...caseDetail.patient,
          weight: latest.weight ?? caseDetail.patient.weight,
          height: latest.height ?? caseDetail.patient.height,
          head_circumference: latest.head_circumference ?? caseDetail.patient.head_circumference,
        }
      : null
    const normalizedMessages = threadMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }))

    const { trimmed, droppedCount } = truncateConversationWindow(normalizedMessages)
    if (droppedCount > 3) {
      const summaryText = trimmed
        .slice(0, 5)
        .map((message) => {
          const label = message.role === "user" ? "Médico" : "Falaped"
          const body =
            message.role === "assistant"
              ? assistantMessageToModelText(message.content)
              : message.content
          return `${label}: ${body}`
        })
        .join(" | ")
      await updateCaseDashboardChatContextSummary(supabase, caseId, profile.id, summaryText)
    }

    const processedTurn = await processAssistantTurn({
      userMessage: content,
      messages: threadMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at,
      })),
      pendingAction: caseRow.pending_action,
      patientContext: withConsultRecords(
        buildPatientContext(
          patient
            ? {
                name: patient.name,
                birth_date: patient.birth_date,
                responsible: patient.responsible,
                weight: patient.weight,
                height: patient.height,
                allergies: patient.allergies,
                current_medications: patient.current_medications,
                medical_history: patient.medical_history,
              }
            : null,
        ),
        consultRecords ? formatConsultRecordsForAi(consultRecords) : null,
      ),
      conversationSummary: caseRow.dashboard_chat_context_summary,
      patientMetrics: {
        weight: parseMetricToNumber(patient?.weight),
        height: (() => {
          const parsed = parseMetricToNumber(patient?.height)
          if (!parsed) return null
          return parsed > 3 ? parsed / 100 : parsed
        })(),
      },
      patientProfile: patient
        ? {
          id: patient.id,
          name: patient.name,
          birth_date: patient.birth_date,
          responsible: patient.responsible,
          contact_phone: patient.contact_phone,
          sex: patient.sex,
          legal_guardian: patient.legal_guardian,
          weight: patient.weight,
          height: patient.height,
          head_circumference: patient.head_circumference,
          blood_type: patient.blood_type,
          allergies: patient.allergies,
          current_medications: patient.current_medications,
          medical_history: patient.medical_history,
        }
        : undefined,
      turnQueue: caseRow.assistant_turn_queue,
    })
    const pipelineResults = processedTurn.pipelineResults

    let reportId: string | undefined
    let reportGeneratedAtSegmentIndex: number | null = null
    const reportHasMinimumData = hasMinimumConversationForReport(normalizedMessages)

    const measurementReplies = new Map<number, string>()
    for (let segmentIndex = 0; segmentIndex < pipelineResults.length; segmentIndex++) {
      const routed = pipelineResults[segmentIndex]
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
        reportGeneratedAtSegmentIndex = segmentIndex
      }

      if (routed.action === "confirm_generate_medical_certificate") {
        // Placeholder for future certificate generation flow confirmation.
      }
      if (routed.action === "confirm_generate_prescription") {
        // Placeholder for future prescription generation flow confirmation.
      }

      if (routed.action === "confirm_update_patient_profile") {
        if (caseDetail?.patient?.id && routed.patientProfileUpdatePayload) {
          await updatePatient(
            supabase,
            caseDetail.patient.id,
            profile.id,
            routed.patientProfileUpdatePayload,
          )
        }
      }

      // Peso/estatura confirmados no chat viram medida do dia da consulta: é o que a
      // ficha, a curva e o painel "Nesta consulta" leem (o campo do cadastro não).
      if (routed.action === "confirm_anthropometric_reference" && caseDetail?.patient?.id) {
        measurementReplies.set(
          segmentIndex,
          await saveChatMeasurement(supabase, profile.id, caseDetail, routed.anthropometricUpdate),
        )
      }

      if (routed.action === "none" && routed.intent === "CLOSE_CASE") {
        await updateCasePendingAction(supabase, caseId, profile.id, "close_case")
      }
    }

    const insertedAssistantMessages: InsertedCaseMessage[] = []
    let lastAssistantIdWithActions: string | null = null

    for (let segmentIndex = 0; segmentIndex < pipelineResults.length; segmentIndex++) {
      const routed = pipelineResults[segmentIndex]

      const suppressReviewButtonsAfterConfirm =
        routed.action === "confirm_anthropometric_reference" ||
        routed.action === "keep_previous_anthropometric_reference" ||
        routed.action === "confirm_update_patient_profile" ||
        routed.action === "decline_update_patient_profile" ||
        routed.action === "confirm_guardian_alert_storage" ||
        routed.action === "decline_guardian_alert_storage" ||
        routed.action === "confirm_close_case"

      const pendingActionForButtons = suppressReviewButtonsAfterConfirm
        ? null
        : routed.intent === "CLOSE_CASE"
          ? "close_case"
          : routed.intent === "GENERATE_REPORT"
            ? reportHasMinimumData
              ? "generate_report"
              : null
            : routed.intent === "GENERATE_MEDICAL_CERTIFICATE"
              ? "generate_medical_certificate"
              : routed.intent === "GENERATE_PRESCRIPTION"
                ? "generate_prescription"
                : routed.intent === "REVIEW_PATIENT_PROFILE_UPDATE"
                  ? routed.showPatientProfileUpdateActions === true
                    ? "review_patient_profile_update"
                    : null
                : routed.intent === "REVIEW_ANTHROPOMETRIC_REFERENCE"
                  ? "review_anthropometric_reference"
                  : routed.intent === "REVIEW_GUARDIAN_ALERT"
                    ? "review_guardian_alert"
                : null

      const patientProfileUpdateSuccessReply =
        routed.action === "confirm_update_patient_profile" &&
          caseDetail?.patient?.id &&
          routed.patientProfileUpdatePayload
          ? formatPatientProfileUpdateSuccessReply(routed.patientProfileUpdatePayload)
          : measurementReplies.get(segmentIndex)

      const isReportInsufficientGate =
        routed.intent === "GENERATE_REPORT" &&
        routed.action === "none" &&
        !reportHasMinimumData

      const assistantReplySanitized = stripAssistantUiLabelsFromReply(routed.reply)
      const polishedAssistantReply =
        patientProfileUpdateSuccessReply !== undefined
          ? assistantReplySanitized
          : await polishAssistantReplyForDisplay({
              reply: assistantReplySanitized,
              intent: routed.intent,
              userMessage: content,
            })

      const replyContent =
        patientProfileUpdateSuccessReply ??
        (isReportInsufficientGate
          ? "Ainda não há conteúdo clínico suficiente para gerar o relatório. Registre sintomas, exame e conduta para continuar."
          : polishedAssistantReply)
      const replyContentPrivacySafe = sanitizeAssistantReplyForPrivacy(replyContent)

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

      const useReportFilePayload =
        reportId !== undefined && segmentIndex === reportGeneratedAtSegmentIndex

      const actionButtons = pendingActionForButtons
        ? buildAssistantActionsFromPendingAction(pendingActionForButtons)
        : undefined

      const payload: AssistantPayload = useReportFilePayload
        ? {
            type: "assistant_report_file",
            title: "Relatório disponível para download",
            content:
              "Relatório gerado com base nas informações registradas neste caso.",
            reportId: reportId!,
            reportFileName: "relatorio-caso.pdf",
          }
        : {
            type: "assistant_reply",
            content: replyContentPrivacySafe,
            showAlertCompact: routed.showAlert,
            clinicalAlertItems:
              routed.showAlert && routed.clinicalAlertItems && routed.clinicalAlertItems.length > 0
                ? routed.clinicalAlertItems
                : undefined,
            blockedAssistantMessageId:
              actionButtons && actionButtons.length > 0
                ? routed.blockedAssistantMessageId ?? undefined
                : undefined,
            actions: actionButtons,
            storedData: storedDataPayload,
          }

      const assistantContent = serializeAssistantPayload(payload)
      const insertedAssistantMessage = await insertCaseMessage(supabase, {
        caseId,
        role: "assistant",
        content: assistantContent,
      })
      insertedAssistantMessages.push(insertedAssistantMessage)

      if (
        payload.type === "assistant_reply" &&
        actionButtons &&
        actionButtons.length > 0
      ) {
        lastAssistantIdWithActions = insertedAssistantMessage.id
      }
    }

    if (processedTurn.shouldPersistQueue) {
      const queueWithBlockedMessage =
        processedTurn.queue &&
        lastAssistantIdWithActions
          ? withBlockedAssistantMessageId(processedTurn.queue, lastAssistantIdWithActions)
          : processedTurn.queue

      await updateCaseAssistantTurnQueue(
        supabase,
        caseId,
        profile.id,
        queueWithBlockedMessage,
      )
    }

    revalidatePath("/dashboard/cases")
    revalidatePath(`/dashboard/cases/new/${caseId}`)

    const lastAssistant =
      insertedAssistantMessages[insertedAssistantMessages.length - 1]!

    return {
      ok: true,
      userMessage: {
        id: insertedUserMessage.id,
        role: "user",
        content: insertedUserMessage.content,
        created_at: insertedUserMessage.created_at,
      },
      assistantMessage: lastAssistant,
      assistantMessages: insertedAssistantMessages,
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


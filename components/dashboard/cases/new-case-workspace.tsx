"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowUpIcon,
  ClipboardListIcon,
  CheckIcon,
  FileTextIcon,
  HistoryIcon,
  InfoIcon,
  Loader2Icon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  TriangleAlertIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/formatters"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeFull, formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { getFallbackCaseChatChips, type CaseChatChipSuggestion } from "@/lib/dashboard-case-chat-chips"
import { suggestCaseChatChipsAction } from "@/actions/cases/suggest-case-chat-chips"
import { sendCaseAssistantMessageAction } from "@/actions/cases/send-case-assistant-message"
import { transcribeNewCaseAudioAction } from "@/actions/cases/transcribe-new-case-audio"
import { downloadCaseReportPdfAction } from "@/actions/cases/download-case-report-pdf"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useSidebar } from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ASSISTANT_POST_RESPONSE_DELAY_MS,
  ASSISTANT_TYPING_MIN_DISPLAY_MS,
} from "@/lib/constants"
import { CLINICAL_NOTATION_SUMMARY_MESSAGE } from "@/lib/format-clinical-assistant-sections"
import { CloseConsultSheet } from "@/components/dashboard/cases/close-consult-sheet"
import type { CaseReport as CaseReportType } from "@/modules/cases/get-case-report"
import type { ReportTemplateWithSections } from "@/modules/report-templates/get-report-template-by-id"
import { toCaseDocuments } from "@/components/dashboard/cases/case-detail-documents"
import { ConsultRail } from "@/components/dashboard/cases/consult-rail"
import { clinicDay, countConsultRecords, type ConsultDocuments, type ConsultRecords } from "@/lib/consult-records"
import { ConsultTimer } from "@/components/dashboard/cases/consult-timer"
import { closeTiming } from "@/lib/consult-idle"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { ConsultTools, openConsultTool } from "@/components/dashboard/cases/consult-tools"
import type { ExamReadingWithPages } from "@/components/dashboard/exam-readings/exam-reading-card"
import type { CaseCarryover } from "@/modules/cases/get-previous-case-carryover"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"
import type { CaseReminder } from "@/modules/cases/types"
import type { PatientAttachment } from "@/modules/patient-attachments/types"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { ExamPanel } from "@/modules/exam-panels/types"
import type { Measurement } from "@/modules/patient-growth/types"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/types"
import type { ScaleResult } from "@/modules/patient-scales/types"

type WorkspaceMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

type AssistantPayload = {
  type: "assistant_reply" | "assistant_report_file"
  title?: string
  content: string
  structuredClinicalNote?: string
  showAlertCompact?: boolean
  clinicalAlertItems?: Array<{ id: string; title: string; detail: string }>
  actions?: Array<{
    id:
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
    | "confirm_pending_imc"
    | "reject_pending_imc"
    | "confirm_stored_data"
    | "reject_stored_data"
    | "cancel_pending_action"
    label: string
  }>
  reportId?: string
  reportFileName?: string
  storedData?: {
    collapsedByDefault: boolean
    items: Array<{
      section: string
      label: string
      value: string
      status: "confirmado" | "pendente_de_confirmacao"
    }>
  }
  blockedAssistantMessageId?: string
}

/** Legacy assistant payloads: content was a stub; body lived in structuredClinicalNote. */
function ClinicalAlertCallout({
  items,
}: {
  items?: Array<{ id: string; title: string; detail: string }>
}) {
  const hasStructuredItems = Boolean(items && items.length > 0)

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-3 flex gap-3 rounded-lg border border-border bg-card p-4 shadow-xs",
        "ring-1 ring-border/50",
      )}
    >
      <div
        className="w-1 shrink-0 rounded-full bg-primary"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <TriangleAlertIcon className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold leading-tight text-foreground">Alerta clínico</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {hasStructuredItems
                ? "O assistente identificou os seguintes pontos no texto que você enviou. Use como lembrete na conduta e antes de encerrar o caso."
                : "Foi detectado contexto de alerta neste turno. Reavalie evolução, conduta e critérios de retorno antes de fechar o atendimento."}
            </p>
          </div>
        </div>
        {hasStructuredItems ? (
          <ul className="space-y-3 border-t border-border pt-3">
            {items!.map((item) => (
              <li key={item.id} className="text-sm leading-relaxed">
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="text-muted-foreground"> — {item.detail}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-[11px] leading-snug text-muted-foreground">
          Sugestão automática com base no texto; não substitui julgamento clínico.
        </p>
      </div>
    </div>
  )
}

function mergeLegacyAssistantDisplay(payload: AssistantPayload): string {
  const main = payload.content.trim()
  const note = payload.structuredClinicalNote?.trim()
  if (note && main === CLINICAL_NOTATION_SUMMARY_MESSAGE) {
    return note
  }
  return payload.content
}

const PAYLOAD_PREFIX = "__FALAPED_JSON__"

function parseAssistantPayload(content: string): AssistantPayload | null {
  if (!content.startsWith(PAYLOAD_PREFIX)) return null
  try {
    return JSON.parse(content.slice(PAYLOAD_PREFIX.length)) as AssistantPayload
  } catch {
    return null
  }
}

/**
 * True when any assistant message **after the last real user turn** still shows confirm/cancel
 * actions that were not followed by a user reply (handles multi-bubble assistant responses).
 */
function getAwaitingPendingActionConfirmation(messages: WorkspaceMessage[]): boolean {
  const resolvedIds = getResolvedAssistantActionMessageIds(messages)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === "user") {
      if (msg.id.startsWith("optimistic-user-")) continue
      return false
    }
    if (msg.role === "assistant") {
      const payload = parseAssistantPayload(msg.content)
      if (
        payload?.type === "assistant_reply" &&
        payload.actions &&
        payload.actions.length > 0
      ) {
        return !resolvedIds.has(msg.id)
      }
      continue
    }
  }
  return false
}

function getResolvedAssistantActionMessageIds(messages: WorkspaceMessage[]): Set<string> {
  const resolvedIds = new Set<string>()

  for (let i = 0; i < messages.length; i += 1) {
    const current = messages[i]
    if (current.role !== "assistant") continue
    const payload = parseAssistantPayload(current.content)
    if (!payload?.actions?.length) continue

    for (let j = i + 1; j < messages.length; j += 1) {
      const next = messages[j]
      if (next.role !== "user") continue
      if (next.id.startsWith("optimistic-user-")) continue
      resolvedIds.add(current.id)
      break
    }
  }

  return resolvedIds
}

/** Scroll/highlight target for pending UI: walk trailing assistants after the last real user message. */
function getLatestBlockedAssistantMessageId(messages: WorkspaceMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role === "user") {
      if (message.id.startsWith("optimistic-user-")) continue
      break
    }
    if (message.role !== "assistant") continue
    const payload = parseAssistantPayload(message.content)
    if (payload?.blockedAssistantMessageId) {
      return payload.blockedAssistantMessageId
    }
    if (payload?.type === "assistant_reply" && payload.actions && payload.actions.length > 0) {
      return message.id
    }
  }
  return null
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-muted px-3 py-0.5 text-caption font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

/** Marca do assistente na conversa: a logo compacta do Falaped. */
function AssistantMark({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático, sem ganho com next/image */}
      <img src="/falaped-icon.svg" alt="" className={cn("size-5 dark:hidden", className)} />
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático, sem ganho com next/image */}
      <img src="/falaped-icon-dark.svg" alt="" className={cn("hidden size-5 dark:block", className)} />
    </>
  )
}

function AssistantStatus({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-caption text-subtle-foreground">
      <AssistantMark className="animate-pulse" />
      {children}
    </div>
  )
}

/** O que a consulta anterior deixou, no topo da conversa (antes era um modal na abertura). */
function CarryoverCard({ carryover, onDismiss }: { carryover: CaseCarryover; onDismiss: () => void }) {
  return (
    <div className="flex gap-3 rounded-xl bg-muted p-4">
      <HistoryIcon className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-label font-semibold">
          Da última consulta · <span className="num">{formatDate(carryover.endedAt ?? carryover.startedAt)}</span>
        </p>
        {carryover.summary ? (
          <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{carryover.summary}</p>
        ) : null}
        {carryover.reminders.length ? (
          <p className="mt-1 text-muted-foreground">
            <span className="font-medium text-foreground">Lembretes:</span> {carryover.reminders.join(" · ")}
          </p>
        ) : null}
      </div>
      <Button variant="ghost" size="icon-xs" aria-label="Dispensar" onClick={onDismiss}>
        <XIcon />
      </Button>
    </div>
  )
}

const buttonPressFeedbackClass =
  "transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"

function ThreadBubble({
  message,
  onAssistantAction,
  onDownloadReport,
  assistantActionsDisabled,
  actionMessageResolved,
  downloadBusy,
  isHighlighted,
}: {
  message: WorkspaceMessage
  onAssistantAction: (actionId: string) => void
  onDownloadReport: (reportId: string) => void
  assistantActionsDisabled: boolean
  actionMessageResolved: boolean
  downloadBusy: boolean
  isHighlighted: boolean
}) {
  const isUser = message.role === "user"
  const payload = !isUser ? parseAssistantPayload(message.content) : null
  const bubbleShapeClass = "gap-0 rounded-xl py-3 shadow-none"
  const hasStoredData = Boolean(payload?.storedData?.items.length)
  const shouldShowInfoPopover = hasStoredData
  const popoverItems = hasStoredData
    ? payload!.storedData!.items.some((item) => item.section === "CALCULO_IMC")
      ? payload!.storedData!.items.filter((item) => item.section === "CALCULO_IMC")
      : payload!.storedData!.items
    : []

  return (
    <div
      data-thread-message-id={message.id}
      className={cn(
        "rounded-xl transition-colors",
        isUser ? "ml-auto max-w-[85%]" : "max-w-[92%]",
        isHighlighted && "ring-2 ring-ring ring-offset-4 ring-offset-background",
      )}
    >
      <div className="flex flex-col gap-1.5">
        {isUser ? null : (
          <div className="flex items-center gap-2 text-caption text-subtle-foreground">
            <AssistantMark />
            Assistente
            <span className="num">{formatTime(message.created_at)}</span>
          </div>
        )}

        {isUser ? (
          <div className="rounded-2xl rounded-br-md bg-primary-soft px-4 py-3 text-read">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : payload ? (
          <Card className={bubbleShapeClass}>
            {payload.type === "assistant_report_file" ? (
              <CardHeader className={cn("pb-2", shouldShowInfoPopover && "pr-10")}>
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <FileTextIcon className="h-4 w-4" />
                  {payload.title ?? "Relatório disponível"}
                </CardTitle>
              </CardHeader>
            ) : null}
            <CardContent className={cn("relative space-y-3 pt-0", shouldShowInfoPopover && "pr-10")}>
              {shouldShowInfoPopover ? (
                <div className="absolute -right-[3px] top-1/2 z-10 -translate-y-1/2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className={cn(
                          "h-7 w-7 rounded-full border-amber-300 bg-amber-50 text-amber-600 shadow-sm",
                          "animate-pulse hover:bg-amber-100",
                          "focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1",
                        )}
                        aria-label="Ver detalhes desta mensagem"
                      >
                        <InfoIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-[560px] max-w-[calc(100vw-2rem)] space-y-3 overflow-x-hidden"
                    >
                      <div>
                        <p className="text-sm font-semibold">Detalhes desta mensagem</p>
                        <p className="text-xs text-muted-foreground">
                          Informações referentes somente a esta resposta do Falaped.
                        </p>
                      </div>

                      <div className="max-h-72 space-y-2 overflow-y-auto overflow-x-hidden pr-1">
                        {popoverItems.map((item, index) => (
                          <div
                            key={`${item.label}-${index}`}
                            className="rounded-md border border-border bg-muted/30 p-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                {item.section}
                              </p>
                              <Badge variant="outline" className="shrink-0 text-[10px] tracking-wide">
                                {item.status === "confirmado"
                                  ? "Confirmado"
                                  : "Pendente de confirmação"}
                              </Badge>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              <span className="font-medium">{item.label}:</span> {item.value}
                            </p>
                            {item.status === "pendente_de_confirmacao" ? (
                              <div className="mt-2 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  type="button"
                                  className="h-7 gap-1.5"
                                  disabled={assistantActionsDisabled || actionMessageResolved}
                                  onClick={() =>
                                    onAssistantAction(
                                      /imc/i.test(item.label)
                                        ? "confirm_pending_imc"
                                        : "confirm_stored_data",
                                    )
                                  }
                                >
                                  <CheckIcon className="h-3.5 w-3.5" />
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  className="h-7 gap-1.5"
                                  disabled={assistantActionsDisabled || actionMessageResolved}
                                  onClick={() =>
                                    onAssistantAction(
                                      /imc/i.test(item.label)
                                        ? "reject_pending_imc"
                                        : "reject_stored_data",
                                    )
                                  }
                                >
                                  <XCircleIcon className="h-3.5 w-3.5" />
                                  Não confirmar
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}

              <p className="whitespace-pre-wrap text-read text-foreground">
                {mergeLegacyAssistantDisplay(payload)}
              </p>

              {payload.showAlertCompact ? (
                <ClinicalAlertCallout items={payload.clinicalAlertItems} />
              ) : null}

              {payload.type === "assistant_report_file" && payload.reportId ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("gap-1.5", buttonPressFeedbackClass)}
                    disabled={assistantActionsDisabled || actionMessageResolved || downloadBusy}
                    aria-busy={downloadBusy}
                    onClick={() => onDownloadReport(payload.reportId!)}
                  >
                    {downloadBusy ? (
                      <>
                        <Loader2Icon className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                        Baixando…
                      </>
                    ) : (
                      "Baixar PDF"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={buttonPressFeedbackClass}
                    disabled={assistantActionsDisabled || actionMessageResolved}
                    onClick={() => onAssistantAction("confirm_generate_report")}
                  >
                    Gerar novamente
                  </Button>
                </div>
              ) : null}

              {payload.actions?.length ? (
                <div className="flex flex-wrap gap-2">
                  {payload.actions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.id === "cancel_pending_action" ? "outline" : "default"}
                      className={buttonPressFeedbackClass}
                      disabled={assistantActionsDisabled || actionMessageResolved}
                      onClick={() => onAssistantAction(action.id)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card className={bubbleShapeClass}>
            <CardContent>
              <p className="whitespace-pre-wrap text-read">{message.content}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export function NewCaseWorkspace({
  caseId,
  initialMessages,
  patient,
  photoUrl,
  startedAt,
  consultationPausedMs,
  consultationPausedAt,
  reminders = [],
  previousCarryover = null,
  documents,
  scaleResults,
  attachments,
  examReadings,
  measurements,
  ageMonths,
  todayIso,
  todayLabel,
  doctor,
  prescriptionTemplates,
  examCatalog,
  examPanels,
  reportTemplate,
  caseReports,
  activityAts,
}: {
  caseId: string
  initialMessages: WorkspaceMessage[]
  patient: CasePatientDetail | null
  /** Signed URL da foto, resolvida no servidor; null cai nas iniciais. */
  photoUrl: string | null
  startedAt: string
  consultationPausedMs: number
  consultationPausedAt: string | null
  /** Lembretes já escritos neste atendimento. */
  reminders?: CaseReminder[]
  /** O que a consulta anterior desta criança deixou; null quando não há. */
  previousCarryover?: CaseCarryover | null
  /** Documentos emitidos nesta consulta. */
  documents: ConsultDocuments
  scaleResults: ScaleResult[]
  attachments: PatientAttachment[]
  examReadings: ExamReadingWithPages[]
  /** Medidas da criança; a coluna mostra só as de hoje. */
  measurements: Measurement[]
  /** Idade em meses inteiros, para filtrar as escalas; null sem nascimento. */
  ageMonths: number | null
  /** Hoje no fuso da clínica: "yyyy-MM-dd" e "dd/MM/yyyy". */
  todayIso: string
  todayLabel: string
  doctor: ConsultDoctor
  prescriptionTemplates: PrescriptionTemplateOption[]
  examCatalog: ExamCatalogItem[]
  examPanels: ExamPanel[]
  /** Para a revisão do Encerrar. */
  reportTemplate: ReportTemplateWithSections | null
  caseReports: CaseReportType[]
  /** Datas do que foi salvo na consulta: mostram se ela ficou esquecida aberta. */
  activityAts: string[]
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sendInFlightRef = useRef(false)
  const transcribeInFlightRef = useRef(false)
  const downloadInFlightRef = useRef(false)
  const insertTranscriptionRef = useRef(false)
  const [messages, setMessages] = useState<WorkspaceMessage[]>(initialMessages)
  const [draft, setDraft] = useState("")
  const [chips, setChips] = useState<CaseChatChipSuggestion[]>(getFallbackCaseChatChips())
  const [chipsLoading, setChipsLoading] = useState(false)
  const [, startSendTransition] = useTransition()
  const [isTranscribing, startTranscribing] = useTransition()
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [submittingChipId, setSubmittingChipId] = useState<string | null>(null)
  const [isDownloadingReport, setIsDownloadingReport] = useState(false)
  const [isFinalizeAudioBusy, setIsFinalizeAudioBusy] = useState(false)
  const [isAssistantResponding, setIsAssistantResponding] = useState(false)
  const [isSlowNetworkExpanded, setIsSlowNetworkExpanded] = useState(false)
  // Subtítulo do Encerrar ("… · 27 min"), fixado no clique; null = fechado.
  const [closeOpen, setCloseOpen] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  const [showCarryover, setShowCarryover] = useState(true)
  const [transcriptionPreview, setTranscriptionPreview] = useState<string | null>(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)

  // Durante a consulta o menu recolhe para ícones; ao sair, volta como estava.
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const sidebarWasOpenRef = useRef(sidebarOpen)
  useEffect(() => {
    const wasOpen = sidebarWasOpenRef.current
    setSidebarOpen(false)
    return () => setSidebarOpen(wasOpen)
  }, [setSidebarOpen])

  const recorder = useAudioRecorder()
  const isTurnLocked =
    isAssistantResponding ||
    isTranscribing ||
    isFinalizeAudioBusy ||
    recorder.isRecording ||
    recorder.isPaused
  const isInteractionLocked = isTurnLocked || isSendingMessage

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  useEffect(() => {
    let isActive = true
    setChipsLoading(true)
    void suggestCaseChatChipsAction(caseId).then((suggested) => {
      if (!isActive) return
      setChips(suggested.chips)
      setChipsLoading(false)
    })
    return () => {
      isActive = false
    }
  }, [caseId])

  useEffect(() => {
    if (!isAssistantResponding) return
    setIsSlowNetworkExpanded(false)
    const timeout = window.setTimeout(() => {
      setIsSlowNetworkExpanded(true)
    }, ASSISTANT_TYPING_MIN_DISPLAY_MS)
    return () => window.clearTimeout(timeout)
  }, [isAssistantResponding])

  const grouped = useMemo(() => {
    const map = new Map<string, WorkspaceMessage[]>()
    for (const message of messages) {
      const dateKey = formatDate(message.created_at)
      const bucket = map.get(dateKey)
      if (bucket) bucket.push(message)
      else map.set(dateKey, [message])
    }
    return Array.from(map.entries())
  }, [messages])

  const awaitingPendingActionConfirmation = useMemo(
    () => getAwaitingPendingActionConfirmation(messages),
    [messages],
  )
  const resolvedAssistantActionMessageIds = useMemo(
    () => getResolvedAssistantActionMessageIds(messages),
    [messages],
  )
  const latestBlockedAssistantMessageId = useMemo(
    () => getLatestBlockedAssistantMessageId(messages),
    [messages],
  )

  /** Blocks textarea, chips, mic, send — not the assistant confirm/cancel buttons. */
  const isComposerBlocked =
    isInteractionLocked || awaitingPendingActionConfirmation || Boolean(latestBlockedAssistantMessageId)

  useEffect(() => {
    if (!highlightedMessageId) return
    const container = scrollRef.current
    if (!container) return
    const target = container.querySelector<HTMLElement>(
      `[data-thread-message-id="${highlightedMessageId}"]`,
    )
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "center" })
    const timeout = window.setTimeout(() => setHighlightedMessageId(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [highlightedMessageId, messages])

  const handleSend = (
    text: string,
    options?: { chipId?: string; bypassPendingActionGate?: boolean },
  ) => {
    if (isTurnLocked) return
    if (awaitingPendingActionConfirmation && !options?.bypassPendingActionGate) return
    const content = text.trim()
    if (!content) return
    if (sendInFlightRef.current) return

    sendInFlightRef.current = true
    setIsSendingMessage(true)
    if (options?.chipId) setSubmittingChipId(options.chipId)

    const optimisticUserMessage: WorkspaceMessage = {
      id: `optimistic-user-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    }

    // Urgent paint: outside startTransition so “Falaped está respondendo…” appears immediately.
    setMessages((previous) => [...previous, optimisticUserMessage])
    setDraft("")
    setIsAssistantResponding(true)

    startSendTransition(async () => {
      try {
        const result = await sendCaseAssistantMessageAction(caseId, content)
        if (!result.ok) {
          setIsAssistantResponding(false)
          setMessages((previous) =>
            previous.filter((message) => message.id !== optimisticUserMessage.id),
          )
          toast.error(getFriendlyToastMessage(result.error))
          setDraft(content)
          return
        }

        setMessages((previous) => [
          ...previous.filter((message) => message.id !== optimisticUserMessage.id),
          result.userMessage,
        ])

        const assistantSegments =
          result.assistantMessages.length > 0
            ? result.assistantMessages
            : [result.assistantMessage]

        for (let segmentIndex = 0; segmentIndex < assistantSegments.length; segmentIndex++) {
          await delayMs(ASSISTANT_POST_RESPONSE_DELAY_MS)
          const segment = assistantSegments[segmentIndex]!
          setMessages((previous) => [...previous, segment])
        }

        const lastAssistantPayload = parseAssistantPayload(
          assistantSegments[assistantSegments.length - 1]!.content,
        )
        if (lastAssistantPayload?.blockedAssistantMessageId) {
          setHighlightedMessageId(lastAssistantPayload.blockedAssistantMessageId)
        }
        setIsAssistantResponding(false)

        setChipsLoading(true)
        const suggested = await suggestCaseChatChipsAction(caseId)
        setChips(suggested.chips)
        setChipsLoading(false)
      } finally {
        sendInFlightRef.current = false
        setIsSendingMessage(false)
        setSubmittingChipId(null)
      }
    })
  }

  const handleAssistantAction = (actionId: string) => {
    if (isInteractionLocked) return
    const bypass = { bypassPendingActionGate: true as const }
    if (actionId === "cancel_pending_action") {
      handleSend("cancelar ação", bypass)
      return
    }
    if (actionId === "confirm_close_case") handleSend("confirmar encerramento", bypass)
    if (actionId === "confirm_generate_report") {
      handleSend("confirmar geração de relatório", bypass)
    }
    if (actionId === "confirm_generate_medical_certificate") {
      handleSend("confirmar geração de atestado", bypass)
    }
    if (actionId === "confirm_generate_prescription") {
      handleSend("confirmar geração de receita", bypass)
    }
    if (actionId === "confirm_update_patient_profile") {
      handleSend("confirmar atualização dos dados do paciente", bypass)
    }
    if (actionId === "decline_update_patient_profile") {
      handleSend("não atualizar dados do paciente", bypass)
    }
    if (actionId === "confirm_anthropometric_reference") {
      handleSend("confirmar novos dados antropométricos", bypass)
    }
    if (actionId === "keep_previous_anthropometric_reference") {
      handleSend("manter valores anteriores", bypass)
    }
    if (actionId === "confirm_guardian_alert_storage") {
      handleSend("salvar alerta para resumo e relatório", bypass)
    }
    if (actionId === "decline_guardian_alert_storage") {
      handleSend("não armazenar alerta", bypass)
    }
    if (actionId === "confirm_pending_imc") {
      handleSend("imc confirmado", bypass)
    }
    if (actionId === "reject_pending_imc") {
      handleSend("não confirmar imc, recalcular com novos dados", bypass)
    }
    if (actionId === "confirm_stored_data") {
      handleSend("confirmar dados registrados", bypass)
    }
    if (actionId === "reject_stored_data") {
      handleSend("não confirmar dados registrados", bypass)
    }
  }

  const handleDownloadReport = async (reportId: string) => {
    if (isTurnLocked || downloadInFlightRef.current) return
    downloadInFlightRef.current = true
    setIsDownloadingReport(true)
    try {
      const downloadResult = await downloadCaseReportPdfAction(reportId)
      if (!downloadResult.ok) {
        toast.error(getFriendlyToastMessage(downloadResult.error))
        return
      }
      const binaryString = atob(downloadResult.pdfBase64)
      const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0))
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = downloadResult.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      downloadInFlightRef.current = false
      setIsDownloadingReport(false)
    }
  }

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    handleSend(draft)
  }

  const handleFinalizeAudio = () => {
    if (transcribeInFlightRef.current) return
    transcribeInFlightRef.current = true
    setIsFinalizeAudioBusy(true)
    startTranscribing(async () => {
      try {
        const file = await recorder.finalize()
        if (!file) return
        try {
          const result = await transcribeNewCaseAudioAction(file)
          if (!result.ok) {
            toast.error(getFriendlyToastMessage(result.error))
            return
          }
          setTranscriptionPreview(result.text)
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Falha ao transcrever áudio. Tente novamente."

          if (message.includes("Body exceeded 1 MB limit")) {
            toast.error(
              "O áudio excedeu o limite de upload da ação. Atualize a página e tente novamente.",
            )
            return
          }

          toast.error("Falha ao transcrever áudio. Tente novamente.")
        }
      } finally {
        transcribeInFlightRef.current = false
        setIsFinalizeAudioBusy(false)
      }
    })
  }

  const allergies = (patient?.allergies ?? "")
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const age = patient?.birth_date
    ? formatPediatricAgeShort(computePediatricAge(patient.birth_date))
    : null
  const fullAge = formatPediatricAgeFull(patient?.birth_date ?? null, new Date())
  const lastWeight = measurements.findLast((m) => m.weight_grams !== null)
  const weightLabel = lastWeight
    ? `${(lastWeight.weight_grams! / 1000).toFixed(2).replace(".", ",")} kg · ${
        lastWeight.measured_on === todayIso ? "hoje" : formatDate(lastWeight.measured_on)
      }`
    : null
  // Dia da consulta no fuso da clínica: a medida é ligada à data, não ao caso.
  const consultDay = clinicDay(startedAt)
  const consultRecords: ConsultRecords = {
    documents,
    measurements: measurements.filter((m) => m.measured_on === consultDay),
    scaleResults: scaleResults.filter((r) => r.case_id === caseId),
    examReadings,
    attachments: attachments.filter((a) => a.case_id === caseId),
  }
  const docCount = countConsultRecords(consultRecords)
  const panelSubtitle = [patient?.name ?? "Paciente não associado", age].filter(Boolean).join(" · ")

  return (
    <section
      aria-label="Consulta em andamento"
      className="-m-8 flex h-dvh flex-col overflow-hidden bg-background"
    >
      <header className="flex shrink-0 items-center gap-4 border-b border-border bg-card px-6 py-3">
        <Avatar className="size-10">
          {photoUrl ? <AvatarImage src={photoUrl} alt={`Foto de ${patient?.name ?? "paciente"}`} /> : null}
          <AvatarFallback className="bg-primary-soft font-semibold text-primary-ink-strong">
            {patient ? getPatientInitials(patient.name) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate font-display text-section font-semibold">
            {patient?.name ?? "Paciente não associado"}
          </h1>
          {patient ? (
            <p className="truncate text-caption text-muted-foreground">
              {fullAge ? <span className="num">{fullAge} · </span> : null}
              <Link href={`/dashboard/patients/${patient.id}`} className="text-primary-ink hover:underline">
                Ver ficha
              </Link>
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ConsultTimer
            caseId={caseId}
            startedAt={startedAt}
            pausedMs={consultationPausedMs}
            pausedAt={consultationPausedAt}
            activityAts={activityAts}
          />
          <Button variant="outline" onClick={() => setRailOpen(true)}>
            <ClipboardListIcon data-icon="inline-start" />
            Nesta consulta
            {docCount ? <span className="num text-caption text-subtle-foreground">{docCount}</span> : null}
            {allergies.length ? (
              <span className="size-2 rounded-full bg-destructive" aria-label="A criança tem alergia" />
            ) : null}
          </Button>
          <Button
            onClick={() => {
              const timing = closeTiming(
                { startedAt, pausedMs: consultationPausedMs, pausedAt: consultationPausedAt },
                activityAts,
                Date.now(),
              )
              const minutes = Math.max(1, Math.round((Date.parse(timing.endedAt) - Date.parse(startedAt) - timing.pausedMs) / 60_000))
              setCloseOpen(
                [panelSubtitle, lastWeight ? `${(lastWeight.weight_grams! / 1000).toFixed(1).replace(".", ",")} kg` : null, `${minutes} min`]
                  .filter(Boolean)
                  .join(" · "),
              )
            }}
          >
            <CheckIcon data-icon="inline-start" />
            Encerrar consulta
          </Button>
        </div>
      </header>

      <ConsultTools
        caseId={caseId}
        patient={patient}
        subtitle={panelSubtitle}
        ageMonths={ageMonths}
        scaleResults={scaleResults}
        attachments={attachments}
        examReadings={examReadings}
        measurements={measurements}
        documentData={{
          allergies,
          weightLabel,
          startedAt,
          doctor,
          prescriptionTemplates,
          examCatalog,
          examPanels,
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Conversa com o assistente"
            className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
          >
            <div className="mx-auto flex max-w-[760px] flex-col gap-4">
              {previousCarryover && showCarryover ? (
                <CarryoverCard carryover={previousCarryover} onDismiss={() => setShowCarryover(false)} />
              ) : null}
              {grouped.map(([label, dayMessages]) => (
                <div key={label} className="flex flex-col gap-4">
                  {grouped.length > 1 ? <DateSeparator label={label} /> : null}
                  {dayMessages.map((message) => (
                    <ThreadBubble
                      key={message.id}
                      message={message}
                      onAssistantAction={handleAssistantAction}
                      onDownloadReport={handleDownloadReport}
                      assistantActionsDisabled={isInteractionLocked}
                      actionMessageResolved={resolvedAssistantActionMessageIds.has(message.id)}
                      downloadBusy={isDownloadingReport}
                      isHighlighted={highlightedMessageId === message.id}
                    />
                  ))}
                </div>
              ))}
              {isTranscribing ? (
                <AssistantStatus>
                  Transcrevendo o áudio… A prévia aparece para você conferir antes de ir para a mensagem.
                </AssistantStatus>
              ) : isAssistantResponding && !recorder.error ? (
                <AssistantStatus>
                  {isSlowNetworkExpanded ? "Ainda respondendo, a conexão está lenta…" : "Respondendo…"}
                </AssistantStatus>
              ) : null}
            </div>
          </div>

          <footer className="shrink-0 border-t border-border bg-card px-6 py-3">
            <div className="mx-auto flex max-w-[760px] flex-col gap-2">
              {chips.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {chips.slice(0, 4).map((chip) => {
                    const chipBusy = chipsLoading || submittingChipId === chip.id
                    return (
                      <Button
                        key={chip.id}
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={isInteractionLocked || chipBusy}
                        aria-busy={chipBusy}
                        className="shrink-0 rounded-full font-normal text-muted-foreground"
                        onClick={() => handleSend(chip.label, { chipId: chip.id })}
                      >
                        {submittingChipId === chip.id ? "Enviando…" : chip.label}
                      </Button>
                    )
                  })}
                </div>
              ) : null}
              <div className="rounded-xl border border-input bg-card p-2 focus-within:border-ring">
                <Textarea
                  aria-label="Mensagem para o assistente"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={
                    awaitingPendingActionConfirmation
                      ? "Confirme ou cancele a ação acima para continuar…"
                      : "Descreva a consulta ou grave o áudio…"
                  }
                  className="field-sizing-fixed h-16 min-h-16 resize-none border-0 bg-transparent px-2 py-1.5 text-read shadow-none focus-visible:ring-0 dark:bg-transparent"
                  disabled={isComposerBlocked}
                />
                <div className="flex items-center gap-1">
                  {recorder.isRecording || recorder.isPaused ? (
                    <>
                      <span className="flex h-8 items-center gap-2 rounded-full border border-border px-3">
                        <span className="size-2 rounded-full bg-destructive" aria-hidden />
                        <span className="num text-label font-medium">{formatElapsed(recorder.elapsedSeconds)}</span>
                        <span className="flex h-4 items-end gap-0.5" aria-hidden>
                          {recorder.waveformBars.map((height, index) => (
                            <span key={index} className="w-0.5 rounded-full bg-primary" style={{ height: `${height}px` }} />
                          ))}
                        </span>
                      </span>
                      <Button size="icon-sm" type="button" variant="ghost" aria-label="Descartar gravação" onClick={recorder.cancel}>
                        <XIcon />
                      </Button>
                      <Button
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                        aria-label={recorder.isRecording ? "Pausar gravação" : "Continuar gravação"}
                        onClick={recorder.isRecording ? recorder.pause : recorder.resume}
                      >
                        {recorder.isRecording ? <PauseIcon /> : <PlayIcon />}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isFinalizeAudioBusy || isTranscribing}
                        aria-busy={isFinalizeAudioBusy || isTranscribing}
                        onClick={handleFinalizeAudio}
                      >
                        {isFinalizeAudioBusy || isTranscribing ? (
                          <Loader2Icon data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <CheckIcon data-icon="inline-start" />
                        )}
                        Concluir gravação
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isComposerBlocked}
                      onClick={() => recorder.start()}
                    >
                      <MicIcon data-icon="inline-start" />
                      Gravar
                    </Button>
                  )}
                  <span className="ml-auto text-caption text-subtle-foreground">
                    <kbd className="font-sans">↵</kbd> envia · <kbd className="font-sans">⇧↵</kbd> nova linha
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isComposerBlocked || !draft.trim()}
                    aria-busy={isSendingMessage || isAssistantResponding}
                    onClick={() => handleSend(draft)}
                  >
                    {isSendingMessage || isAssistantResponding ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <ArrowUpIcon data-icon="inline-start" />
                    )}
                    Enviar
                  </Button>
                </div>
              </div>
              {recorder.error ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-danger-soft px-3 py-2 text-label">
                  <p role="alert" className="text-danger-text">{recorder.error}</p>
                  <Button variant="outline" size="xs" onClick={() => recorder.start()}>
                    Tentar de novo
                  </Button>
                </div>
              ) : null}
            </div>
          </footer>
      </div>

      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent className="gap-0 rounded-l-2xl bg-card data-[side=right]:w-[380px] data-[side=right]:sm:max-w-[380px]">
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle className="font-display text-section font-semibold">Nesta consulta</SheetTitle>
            <SheetDescription className="text-caption text-subtle-foreground">{panelSubtitle}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-auto px-6 py-5">
            <ConsultRail
              caseId={caseId}
              records={consultRecords}
              reminders={reminders}
              allergies={allergies}
              patientId={patient?.id ?? null}
            />
          </div>
        </SheetContent>
      </Sheet>

      <CloseConsultSheet
        caseId={caseId}
        open={closeOpen !== null}
        onOpenChange={(open) => !open && setCloseOpen(null)}
        subtitle={closeOpen ?? panelSubtitle}
        todayLabel={todayLabel}
        template={reportTemplate}
        caseReports={caseReports}
        // O relatório sai da conversa ou do que foi feito no app.
        hasMessages={messages.length > 0 || docCount > 0}
        documents={toCaseDocuments(documents)}
        reminders={reminders}
        startedAt={startedAt}
        activityAts={activityAts}
        onOpenTool={openConsultTool}
      />

      <AlertDialog
        open={Boolean(transcriptionPreview)}
        onOpenChange={(open) => {
          if (!open) setTranscriptionPreview(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Prévia da transcrição</AlertDialogTitle>
            <AlertDialogDescription>
              Revise o texto antes de inserir no rascunho. Nada será enviado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed">
            {transcriptionPreview}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTranscriptionPreview(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonPressFeedbackClass}
              onClick={() => {
                if (!transcriptionPreview || insertTranscriptionRef.current) return
                insertTranscriptionRef.current = true
                const text = transcriptionPreview
                setDraft((current) =>
                  current.trim() ? `${current.trim()}\n\n${text}` : text,
                )
                setTranscriptionPreview(null)
                window.setTimeout(() => {
                  insertTranscriptionRef.current = false
                }, 0)
              }}
            >
              Inserir no rascunho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}


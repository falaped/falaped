"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BotIcon,
  CheckIcon,
  FileTextIcon,
  InfoIcon,
  Loader2Icon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
  StethoscopeIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/formatters"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { getFallbackCaseChatChips, type CaseChatChipSuggestion } from "@/lib/dashboard-case-chat-chips"
import { suggestCaseChatChipsAction } from "@/actions/cases/suggest-case-chat-chips"
import { sendCaseAssistantMessageAction } from "@/actions/cases/send-case-assistant-message"
import { transcribeNewCaseAudioAction } from "@/actions/cases/transcribe-new-case-audio"
import { downloadCaseReportPdfAction } from "@/actions/cases/download-case-report-pdf"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
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
}

/** Legacy assistant payloads: content was a stub; body lived in structuredClinicalNote. */
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
 * True when the latest assistant message shows confirm/cancel actions and the user has not
 * yet completed a real reply (optimistic in-flight messages are ignored).
 */
function getAwaitingPendingActionConfirmation(messages: WorkspaceMessage[]): boolean {
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
        return true
      }
      return false
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
      <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

const buttonPressFeedbackClass =
  "transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"

function ThreadBubble({
  message,
  userDisplayName,
  onAssistantAction,
  onDownloadReport,
  assistantActionsDisabled,
  actionMessageResolved,
  downloadBusy,
}: {
  message: WorkspaceMessage
  userDisplayName: string
  onAssistantAction: (actionId: string) => void
  onDownloadReport: (reportId: string) => void
  assistantActionsDisabled: boolean
  actionMessageResolved: boolean
  downloadBusy: boolean
}) {
  const isUser = message.role === "user"
  const payload = !isUser ? parseAssistantPayload(message.content) : null
  const bubbleShapeClass = isUser
    ? "rounded-xl rounded-tr-none"
    : "rounded-xl rounded-tl-none"
  const hasStoredData = Boolean(payload?.storedData?.items.length)
  const shouldShowInfoPopover = hasStoredData
  const popoverItems = hasStoredData
    ? payload!.storedData!.items.some((item) => item.section === "CALCULO_IMC")
      ? payload!.storedData!.items.filter((item) => item.section === "CALCULO_IMC")
      : payload!.storedData!.items
    : []

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/15 text-primary">
            <BotIcon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("max-w-[78%] space-y-1", isUser && "items-end")}>
        <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", isUser && "justify-end")}>
          <span className="font-medium">{isUser ? userDisplayName : "Falaped"}</span>
          <span>{formatTime(message.created_at)}</span>
        </div>

        {isUser ? (
          <div
            className={cn(
              bubbleShapeClass,
              "border border-primary/30 bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm",
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : payload ? (
          <Card className={cn(bubbleShapeClass, "border-border/70 shadow-sm")}>
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

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {mergeLegacyAssistantDisplay(payload)}
              </p>

              {payload.showAlertCompact ? (
                <details className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-medium text-amber-800">
                    Ver alerta clínico
                  </summary>
                  <p className="mt-2 text-amber-900">
                    Sinal de alerta clínico detectado. Reavalie evolução e conduta antes de fechar o atendimento.
                  </p>
                </details>
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
          <Card className={cn(bubbleShapeClass, "border-border/70 shadow-sm")}>
            <CardContent className="py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary">
            <StethoscopeIcon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export function NewCaseWorkspace({
  caseId,
  initialMessages,
  patient,
  userDisplayName,
}: {
  caseId: string
  initialMessages: WorkspaceMessage[]
  patient: {
    id: string
    name: string
    birth_date: string | null
    responsible: string | null
    contact_phone: string | null
  } | null
  userDisplayName: string
}) {
  const router = useRouter()
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
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [transcriptionPreview, setTranscriptionPreview] = useState<string | null>(null)

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

  /** Blocks textarea, chips, mic, send — not the assistant confirm/cancel buttons. */
  const isComposerBlocked =
    isInteractionLocked || awaitingPendingActionConfirmation

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
          toast.error(result.error)
          setDraft(content)
          return
        }

        setMessages((previous) => [
          ...previous.filter((message) => message.id !== optimisticUserMessage.id),
          result.userMessage,
        ])

        await delayMs(ASSISTANT_POST_RESPONSE_DELAY_MS)

        setMessages((previous) => [...previous, result.assistantMessage])
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
        toast.error(downloadResult.error)
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
            toast.error(result.error)
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

  const userHasSentMessages = messages.some((message) => message.role === "user")

  return (
    <section
      aria-label="Área do novo caso"
      className="-m-8 flex h-[calc(100dvh-2rem)] flex-col overflow-hidden bg-sidebar"
    >
      <header className="shrink-0 border-b border-border/60 bg-transparent px-8 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/80 px-4 py-3 shadow-xs backdrop-blur-sm">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-[11px]">
                Workspace ativo
              </Badge>
              <span className="truncate text-xs text-muted-foreground">
                Atendimento pediátrico em andamento
              </span>
            </div>

            <div>
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {patient?.name ?? "Paciente não associado"}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {patient?.responsible
                  ? `Responsável: ${patient.responsible}`
                  : "Responsável não informado"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className={buttonPressFeedbackClass}>
              <Link href="/dashboard/cases/select-patient">Trocar paciente</Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className={buttonPressFeedbackClass}
              onClick={() => {
                if (userHasSentMessages) {
                  router.push("/dashboard/cases")
                  return
                }
                setShowDiscardDialog(true)
              }}
            >
              Sair do workspace
            </Button>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Histórico da conversa do caso"
        className="flex-1 min-h-0 overflow-y-auto px-8 py-6"
      >
        <div className="mx-auto flex max-w-5xl flex-col space-y-6">
          {grouped.map(([label, dayMessages]) => (
            <div key={label} className="space-y-4">
              <DateSeparator label={label} />
              {dayMessages.map((message) => (
                <ThreadBubble
                  key={message.id}
                  message={message}
                  userDisplayName={userDisplayName}
                  onAssistantAction={handleAssistantAction}
                  onDownloadReport={handleDownloadReport}
                  assistantActionsDisabled={isInteractionLocked}
                  actionMessageResolved={resolvedAssistantActionMessageIds.has(message.id)}
                  downloadBusy={isDownloadingReport}
                />
              ))}
            </div>
          ))}
          {isTranscribing ? (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/15 text-primary">
                  <BotIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="border-border/70 shadow-sm">
                <CardContent className="flex items-center gap-3 py-3">
                  <Loader2Icon className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm font-medium">Transcrevendo áudio...</p>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2"
                    onClick={() => setIsSlowNetworkExpanded((value) => !value)}
                  >
                    Ver detalhes
                  </button>
                </CardContent>
                {isSlowNetworkExpanded ? (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      O áudio está sendo processado no servidor. Em seguida, a prévia será exibida
                      para confirmação antes de inserir no rascunho.
                    </p>
                  </CardContent>
                ) : null}
              </Card>
            </div>
          ) : isAssistantResponding && !recorder.error ? (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/15 text-primary">
                  <BotIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <p>Falaped está respondendo...</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Separator />

      <footer className="shrink-0 border-t border-border/60 bg-transparent px-8 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-xl border border-border/60 bg-card/80 p-4 shadow-xs backdrop-blur-sm">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {chips.slice(0, 4).map((chip) => {
              const chipBusy = chipsLoading || submittingChipId === chip.id
              return (
                <Button
                  key={chip.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isInteractionLocked}
                  aria-label={chip.label}
                  aria-busy={chipBusy}
                  className={cn(
                    "h-8 shrink-0",
                    buttonPressFeedbackClass,
                    chipBusy && "relative overflow-hidden",
                  )}
                  onClick={() => handleSend(chip.label, { chipId: chip.id })}
                >
                  {chipBusy ? (
                    <span className="relative flex min-w-25 items-center justify-center py-0.5">
                      <Skeleton
                        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-70"
                        aria-hidden
                      />
                      <span className="relative z-10 text-[0.7rem] font-normal leading-none text-muted-foreground">
                        {submittingChipId === chip.id ? "Enviando…" : "Carregando…"}
                      </span>
                    </span>
                  ) : (
                    chip.label
                  )}
                </Button>
              )
            })}
          </div>

          <div className="relative">
            <Textarea
              aria-label="Mensagem para o Falaped"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={
                awaitingPendingActionConfirmation
                  ? "Confirme ou cancele a ação acima para continuar…"
                  : "Descreva os achados clínicos ou peça uma análise…"
              }
              className="field-sizing-fixed h-[88px] min-h-[88px] max-h-[88px] resize-none overflow-y-auto pr-32 text-sm leading-relaxed"
              disabled={isComposerBlocked}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {recorder.isRecording || recorder.isPaused ? (
                <>
                  <div className="flex h-8 items-center gap-2 overflow-hidden rounded-full border border-border bg-background px-3 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium tabular-nums">
                      {formatElapsed(recorder.elapsedSeconds)}
                    </span>
                    <div className="flex h-4 items-end gap-0.5">
                      {recorder.waveformBars.map((height, index) => (
                        <span
                          key={index}
                          className="w-0.5 rounded-full bg-primary/80"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    type="button"
                    variant="ghost"
                    className={buttonPressFeedbackClass}
                    onClick={recorder.cancel}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                  {recorder.isRecording ? (
                    <Button
                      size="icon"
                      type="button"
                      variant="outline"
                      className={buttonPressFeedbackClass}
                      onClick={recorder.pause}
                    >
                      <PauseIcon className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      type="button"
                      variant="outline"
                      className={buttonPressFeedbackClass}
                      onClick={recorder.resume}
                    >
                      <PlayIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className={buttonPressFeedbackClass}
                    disabled={isFinalizeAudioBusy || isTranscribing}
                    aria-busy={isFinalizeAudioBusy || isTranscribing}
                    onClick={handleFinalizeAudio}
                  >
                    {isFinalizeAudioBusy || isTranscribing ? (
                      <>
                        <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        Processando…
                      </>
                    ) : (
                      "Finalizar"
                    )}
                  </Button>
                </>
              ) : null}
              <Button
                size="icon"
                type="button"
                variant="ghost"
                aria-label="Gravar áudio"
                className={buttonPressFeedbackClass}
                disabled={isComposerBlocked}
                onClick={() => recorder.start()}
              >
                <MicIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                type="button"
                aria-label="Enviar mensagem"
                className={buttonPressFeedbackClass}
                disabled={isComposerBlocked || !draft.trim()}
                aria-busy={isSendingMessage || isAssistantResponding}
                onClick={() => handleSend(draft)}
              >
                {isSendingMessage || isAssistantResponding ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {recorder.error && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p role="alert" className="text-destructive">
                  {recorder.error}
                </p>
                <Button variant="outline" size="sm" onClick={() => recorder.start()}>
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </footer>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar consulta sem mensagens?</AlertDialogTitle>
            <AlertDialogDescription>
              Ainda não há mensagens do pediatra neste caso. Se sair agora, este início de
              atendimento será descartado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Salvar e continuar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/dashboard/cases">Descartar e sair</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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


"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PauseIcon, PlayIcon } from "lucide-react"
import { toast } from "sonner"

import { pauseConsultationAction, resumeConsultationAction } from "@/actions"
import { format } from "date-fns"
import { tz } from "@date-fns/tz"

import { useConsultationTimer } from "@/hooks/use-consultation-timer"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { summarizeIdle } from "@/lib/consult-idle"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const pad = (n: number) => n.toString().padStart(2, "0")
  const hours = Math.floor(total / 3600)
  const rest = `${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
  return hours > 0 ? `${hours}:${rest}` : rest
}

/**
 * Cronômetro dentro do cabeçalho da Consulta (protótipo a5), no lugar do widget flutuante.
 * Intervalos de 2h30 sem nada salvo não contam; parada agora, a consulta congela na última
 * atividade e volta a contar sozinha quando algo novo é salvo (lib/consult-idle.ts).
 */
export function ConsultTimer({
  caseId,
  startedAt,
  pausedMs,
  pausedAt,
  activityAts,
}: {
  caseId: string
  startedAt: string
  pausedMs: number
  pausedAt: string | null
  activityAts: string[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const { gapsMs, idleSince } = summarizeIdle(startedAt, activityAts, Date.now())
  const idle = pausedAt == null ? idleSince : null
  const elapsedMs = useConsultationTimer({ startedAt, endedAt: null, pausedMs: pausedMs + gapsMs, pausedAt: pausedAt ?? idle })
  const isPaused = pausedAt != null

  async function toggle() {
    setPending(true)
    try {
      const result = isPaused ? await resumeConsultationAction(caseId) : await pauseConsultationAction(caseId)
      if (result.ok) router.refresh()
      else toast.error(getFriendlyToastMessage(result.error))
    } finally {
      setPending(false)
    }
  }

  if (idle) {
    const since = format(idle, "HH:mm", { in: tz(CLINIC_TIME_ZONE) })
    return (
      <span
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-warning-border bg-warning-soft px-3 text-warning-text"
        title="Volta a contar quando algo novo for registrado na consulta."
      >
        <span className="size-2 rounded-full bg-warning" aria-hidden />
        <span className="num font-medium">{formatElapsed(elapsedMs)}</span>
        <span className="text-caption">
          Sem atividade desde <span className="num">{since}</span>
        </span>
      </span>
    )
  }

  const label = isPaused ? "Retomar cronômetro" : "Pausar cronômetro"
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-muted-foreground">
      <span className={cn("size-2 rounded-full", isPaused ? "bg-subtle-foreground" : "animate-pulse bg-success")} aria-hidden />
      <span className="num font-medium text-foreground" aria-label={`Tempo de consulta ${formatElapsed(elapsedMs)}`}>
        {formatElapsed(elapsedMs)}
      </span>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={label}
        title={label}
        className="text-subtle-foreground hover:text-foreground disabled:opacity-50"
      >
        {isPaused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
      </button>
    </span>
  )
}

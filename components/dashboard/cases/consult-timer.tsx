"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PauseIcon, PlayIcon } from "lucide-react"
import { toast } from "sonner"

import { pauseConsultationAction, resumeConsultationAction } from "@/actions"
import { useConsultationTimer } from "@/hooks/use-consultation-timer"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const pad = (n: number) => n.toString().padStart(2, "0")
  const hours = Math.floor(total / 3600)
  const rest = `${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
  return hours > 0 ? `${hours}:${rest}` : rest
}

/** Cronômetro dentro do cabeçalho da Consulta (protótipo a5), no lugar do widget flutuante. */
export function ConsultTimer({
  caseId,
  startedAt,
  pausedMs,
  pausedAt,
}: {
  caseId: string
  startedAt: string
  pausedMs: number
  pausedAt: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const elapsedMs = useConsultationTimer({ startedAt, endedAt: null, pausedMs, pausedAt })
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

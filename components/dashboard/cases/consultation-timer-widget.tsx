"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { GripVerticalIcon, PauseIcon, PlayIcon, RotateCcwIcon, TimerIcon } from "lucide-react"

import { useConsultationTimer } from "@/hooks/use-consultation-timer"
import {
  pauseConsultationAction,
  resumeConsultationAction,
  resetConsultationAction,
} from "@/actions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const POSITION_STORAGE_KEY = "falaped:consultation-timer-position"
const WIDGET_WIDTH = 232
const WIDGET_HEIGHT = 96
const VIEWPORT_MARGIN = 8

type Position = { x: number; y: number }

function clampToViewport(pos: Position): Position {
  if (typeof window === "undefined") return pos
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - WIDGET_WIDTH - VIEWPORT_MARGIN)
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - WIDGET_HEIGHT - VIEWPORT_MARGIN)
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, pos.x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, pos.y), maxY),
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

type ConsultationTimerWidgetProps = {
  caseId: string
  startedAt: string
  endedAt: string | null
  consultationPausedMs: number
  consultationPausedAt: string | null
}

const DRAGGABLE_ID = "consultation-timer-widget"

function TimerPanel({
  caseId,
  startedAt,
  endedAt,
  consultationPausedMs,
  consultationPausedAt,
  position,
}: ConsultationTimerWidgetProps & { position: Position }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: DRAGGABLE_ID,
  })

  const elapsedMs = useConsultationTimer({
    startedAt,
    endedAt,
    pausedMs: consultationPausedMs,
    pausedAt: consultationPausedAt,
  })

  const isEnded = endedAt != null
  const isPaused = !isEnded && consultationPausedAt != null

  const left = position.x + (transform?.x ?? 0)
  const top = position.y + (transform?.y ?? 0)

  const onToggle = useCallback(async () => {
    setIsPending(true)
    try {
      const result = isPaused
        ? await resumeConsultationAction(caseId)
        : await pauseConsultationAction(caseId)
      if (result.ok) {
        router.refresh()
      }
    } finally {
      setIsPending(false)
    }
  }, [caseId, isPaused, router])

  const onReset = useCallback(async () => {
    setIsPending(true)
    try {
      const result = await resetConsultationAction(caseId)
      if (result.ok) {
        router.refresh()
      }
    } finally {
      setIsPending(false)
    }
  }, [caseId, router])

  return (
    <div
      ref={setNodeRef}
      style={{ left, top }}
      className={cn(
        "fixed z-50 w-[232px] select-none rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm",
        isEnded && "opacity-90",
      )}
    >
      <div className="flex items-center gap-1.5 p-2.5">
        <div
          {...attributes}
          {...listeners}
          aria-label="Mover cronômetro"
          className="flex h-12 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </div>

        <div className="flex flex-1 flex-col gap-0.5">
          <span className="flex items-center justify-between gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <TimerIcon className="size-3.5" aria-hidden />
              Consulta
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={isPending}
                  aria-label="Resetar cronômetro"
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground disabled:opacity-50"
                >
                  <RotateCcwIcon className="size-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar cronômetro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O tempo decorrido volta para 00:00 e qualquer pausa é descartada. Esta ação
                    não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onReset}>Resetar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </span>
          <span className="font-mono text-2xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
            {formatElapsed(elapsedMs)}
          </span>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {isPaused ? (
              <>
                <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                Pausado
              </>
            ) : isEnded ? (
              <>
                <span className="size-1.5 rounded-full border border-muted-foreground/50" />
                Encerrado
              </>
            ) : (
              <>
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                Em andamento
              </>
            )}
          </span>
        </div>

        {!isEnded ? (
          <Button
            variant="secondary"
            size="icon"
            disabled={isPending}
            onClick={onToggle}
            aria-label={isPaused ? "Retomar consulta" : "Pausar consulta"}
            className="size-10 shrink-0 rounded-xl"
          >
            {isPaused ? (
              <PlayIcon className="size-4" />
            ) : (
              <PauseIcon className="size-4" />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function ConsultationTimerWidget(props: ConsultationTimerWidgetProps) {
  // Encerrado: o caso não está mais em andamento — não exibir o cronômetro.
  if (props.endedAt != null) return null

  return <ConsultationTimerWidgetInner {...props} />
}

function ConsultationTimerWidgetInner(props: ConsultationTimerWidgetProps) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor),
  )

  // Initialize position from localStorage (or default bottom-right), clamped.
  useEffect(() => {
    let stored: Position | null = null
    try {
      const raw = window.localStorage.getItem(POSITION_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Position>
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          stored = { x: parsed.x, y: parsed.y }
        }
      }
    } catch {
      stored = null
    }

    const fallback: Position = {
      x: window.innerWidth - WIDGET_WIDTH - 24,
      y: window.innerHeight - WIDGET_HEIGHT - 24,
    }
    setPosition(clampToViewport(stored ?? fallback))
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setPosition((prev) => {
        const next = clampToViewport({
          x: prev.x + event.delta.x,
          y: prev.y + event.delta.y,
        })
        try {
          window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // localStorage unavailable — position simply not persisted.
        }
        return next
      })
    },
    [],
  )

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <TimerPanel {...props} position={position} />
    </DndContext>
  )
}

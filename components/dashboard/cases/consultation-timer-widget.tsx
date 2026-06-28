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
import { GripVerticalIcon, PauseIcon, PlayIcon } from "lucide-react"

import { useConsultationTimer } from "@/hooks/use-consultation-timer"
import {
  pauseConsultationAction,
  resumeConsultationAction,
} from "@/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const POSITION_STORAGE_KEY = "falaped:consultation-timer-position"
const WIDGET_WIDTH = 200
const WIDGET_HEIGHT = 72
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

  return (
    <div
      ref={setNodeRef}
      style={{ left, top }}
      className="fixed z-50 w-auto min-w-[180px] rounded-lg border border-border bg-card p-3 shadow-md"
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          aria-label="Mover cronômetro"
          className="flex min-h-11 min-w-11 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4 opacity-60" />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <span className="text-base font-semibold tabular-nums">
            {formatElapsed(elapsedMs)}
          </span>
          {isPaused ? (
            <Badge
              variant="outline"
              className="w-fit text-xs font-normal text-muted-foreground"
            >
              Pausado
            </Badge>
          ) : isEnded ? (
            <Badge
              variant="outline"
              className="w-fit text-xs font-normal text-muted-foreground"
            >
              Encerrado
            </Badge>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Em andamento
            </span>
          )}
        </div>

        {!isEnded ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            onClick={onToggle}
            aria-label={isPaused ? "Retomar consulta" : "Pausar consulta"}
            className={cn("min-h-11 min-w-11", "transition-colors")}
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

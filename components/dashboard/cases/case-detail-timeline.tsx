import { formatDateTime, formatRelativeTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export type CaseDetailTimelineProps = {
  startedAt: string
  lastMessageAt: string | null
  /** When false, timeline uses archive-oriented labels for messages. */
  isActive: boolean
}

/**
 * Compact snapshot: start time and last message (no channel / report — those live elsewhere).
 */
export function CaseDetailTimeline({
  startedAt,
  lastMessageAt,
  isActive,
}: CaseDetailTimelineProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
      aria-label="Linha do tempo do caso"
    >
      <div className="flex min-w-0 flex-col gap-0.5 sm:max-w-[220px]">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Início
        </span>
        <span className="truncate text-sm font-medium text-foreground">
          {formatDateTime(startedAt)}
        </span>
      </div>

      <div
        className="hidden h-8 w-px shrink-0 bg-border sm:block"
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Última mensagem
        </span>
        <p
          className={cn(
            "mt-0.5 text-sm font-medium",
            lastMessageAt ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {lastMessageAt
            ? formatRelativeTime(lastMessageAt)
            : isActive
              ? "Nenhuma ainda"
              : "—"}
        </p>
      </div>
    </div>
  )
}

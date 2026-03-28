import { Badge } from "@/components/ui/badge"
import { formatDateTime, formatRelativeTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

import type { CaseOrigin } from "@/modules/cases/types"

function originLabel(origin: CaseOrigin): string {
  return origin === "whatsapp" ? "WhatsApp" : "Painel"
}

export type CaseDetailTimelineProps = {
  startedAt: string
  origin: CaseOrigin
  lastMessageAt: string | null
  latestReport: { is_finalized: boolean; updated_at: string } | null
  /** When false, timeline uses archive-oriented labels. */
  isActive: boolean
}

/**
 * Compact horizontal timeline for case snapshot (start, channel, last message, report).
 */
export function CaseDetailTimeline({
  startedAt,
  origin,
  lastMessageAt,
  latestReport,
  isActive,
}: CaseDetailTimelineProps) {
  const reportLabel =
    latestReport == null
      ? "Sem relatório"
      : latestReport.is_finalized
        ? "Finalizado"
        : "Em edição"

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
      aria-label="Linha do tempo do caso"
    >
      <div className="flex min-w-0 flex-col gap-0.5 sm:max-w-[200px]">
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

      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Canal
        </span>
        <Badge variant="secondary" className="w-fit font-normal">
          {originLabel(origin)}
        </Badge>
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

      <div
        className="hidden h-8 w-px shrink-0 bg-border sm:block"
        aria-hidden
      />

      <div className="min-w-0 sm:max-w-[220px]">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Relatório
        </span>
        <p className="mt-0.5 text-sm font-medium text-foreground">
          {reportLabel}
          {latestReport != null ? (
            <span className="block text-xs font-normal text-muted-foreground">
              {formatRelativeTime(latestReport.updated_at)}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  )
}

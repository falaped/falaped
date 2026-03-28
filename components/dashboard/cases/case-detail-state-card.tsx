import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { CaseDetailTimeline } from "@/components/dashboard/cases/case-detail-timeline"

export type CaseDetailStateCardProps = {
  startedAt: string
  isActive: boolean
  messageCount: number
  lastMessageAt: string | null
  contextSummaryDisplay: string | null
  /** True when raw persisted summary exists but could not be sanitized for display. */
  clinicalSummaryDisplayUnavailable?: boolean
}

/**
 * Snapshot: timeline, message count line, and optional sanitized panel summary.
 */
export function CaseDetailStateCard({
  startedAt,
  isActive,
  messageCount,
  lastMessageAt,
  contextSummaryDisplay,
  clinicalSummaryDisplayUnavailable = false,
}: CaseDetailStateCardProps) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Visão do caso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Linha do tempo rápida e resumo do painel quando disponível.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <CaseDetailTimeline
          startedAt={startedAt}
          lastMessageAt={lastMessageAt}
          isActive={isActive}
        />

        <p className="text-xs text-muted-foreground">
          Total no histórico:{" "}
          <span className="font-medium text-foreground">{messageCount}</span>{" "}
          {messageCount === 1 ? "mensagem" : "mensagens"}
        </p>

        {contextSummaryDisplay ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Resumo clínico (painel)
            </p>
            <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-muted-foreground">
              {contextSummaryDisplay}
            </p>
          </div>
        ) : clinicalSummaryDisplayUnavailable ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Resumo clínico (painel)
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Resumo indisponível para exibição no momento.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

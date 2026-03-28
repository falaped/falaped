import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { CaseOrigin } from "@/modules/cases/types"

import { CaseDetailTimeline } from "@/components/dashboard/cases/case-detail-timeline"

export type CaseDetailStateCardProps = {
  startedAt: string
  origin: CaseOrigin
  isActive: boolean
  messageCount: number
  lastMessageAt: string | null
  latestReport: { is_finalized: boolean; updated_at: string } | null
  contextSummaryDisplay: string | null
  /** True when raw persisted summary exists but could not be sanitized for display. */
  clinicalSummaryDisplayUnavailable?: boolean
}

/**
 * Snapshot: timeline, message count line, and optional sanitized panel summary.
 */
export function CaseDetailStateCard({
  startedAt,
  origin,
  isActive,
  messageCount,
  lastMessageAt,
  latestReport,
  contextSummaryDisplay,
  clinicalSummaryDisplayUnavailable = false,
}: CaseDetailStateCardProps) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Visão do caso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Linha do tempo e leitura rápida; a conversa e o relatório seguem abaixo
          nesta página.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <CaseDetailTimeline
          startedAt={startedAt}
          origin={origin}
          lastMessageAt={lastMessageAt}
          latestReport={latestReport}
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

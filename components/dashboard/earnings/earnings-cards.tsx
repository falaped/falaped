import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCentsToBRL } from "@/lib/formatters"
import type { EarningsSummary } from "@/modules/financial-entries/types"

type EarningsCardsProps = {
  summary: EarningsSummary
  /** Rótulos de data já formatados pelo RSC no fuso da clínica — o cliente não deriva datas. */
  todayLabel: string
  weekLabel: string
  monthLabel: string
  periodLabel: string
  /** Falso quando o período navegado não é o mês atual: aí a Faixa A ganha o badge de deriva. */
  isCurrentPeriod: boolean
}

const AVERAGE_TOOLTIP =
  "Total do período dividido pelo número de atendimentos: cada caso conta uma vez, mesmo com vários procedimentos. Lançamentos avulsos contam um cada."

/**
 * As duas faixas do painel de Ganhos (S1). Faixa A é relativa a HOJE e nunca muda ao
 * navegar; Faixa B segue o período navegado e vive num Card único cujo header é o escopo.
 *
 * Nenhuma aritmética de dinheiro acontece aqui: `period_cents` e `average_cents` são
 * renderizados exatamente como chegam de `get_earnings_summary`. Os três cards da Faixa A
 * são escritos por extenso (e não por um helper) seguindo o molde de
 * `dashboard-home-content.tsx` — cada valor carrega o próprio `tabular-nums` à vista.
 */
export function EarningsCards({
  summary,
  todayLabel,
  weekLabel,
  monthLabel,
  periodLabel,
  isCurrentPeriod,
}: EarningsCardsProps) {
  const hasAttendances = summary.attendances > 0

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Hoje</h2>
          {isCurrentPeriod ? null : (
            <Badge variant="secondary">Sempre o mês atual</Badge>
          )}
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Hoje
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCentsToBRL(summary.today_cents)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{todayLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Esta semana
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCentsToBRL(summary.week_cents)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{weekLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Este mês
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCentsToBRL(summary.month_cents)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{monthLabel}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Período</h2>
            <span className="text-sm font-medium text-foreground">{periodLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total do período
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatCentsToBRL(summary.period_cents)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
          </div>
          <div>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="w-fit cursor-help text-xs uppercase tracking-wide text-muted-foreground">
                    Média por atendimento
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{AVERAGE_TOOLTIP}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {hasAttendances ? formatCentsToBRL(summary.average_cents) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasAttendances
                ? summary.attendances === 1
                  ? "1 atendimento no período"
                  : `${summary.attendances} atendimentos no período`
                : "Nenhum atendimento cobrado no período."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

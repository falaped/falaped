import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCentsToBRL } from "@/lib/formatters"
import { PAYMENT_METHOD_LABEL } from "@/lib/schemas/financial-entry"
import { cn } from "@/lib/utils"
import type { FinancialEntryListRow } from "@/modules/financial-entries/list-financial-entries"
import { VoidEntryButton } from "@/components/dashboard/earnings/void-entry-button"

/** `yyyy-MM-dd` → `dd/MM`, por fatia da string: construir data deslocaria o dia em UTC. */
function toDayMonth(receivedOn: string): string {
  return `${receivedOn.slice(8, 10)}/${receivedOn.slice(5, 7)}`
}

/**
 * A lista de lançamentos do período (EARN-03/EARN-05).
 *
 * As linhas chegam ORDENADAS do SQL e o filtro de anulados também vive lá: este componente
 * não ordena, não filtra e não soma. É por isso que as linhas anuladas aparecem
 * intercaladas na ordem de data quando o filtro está ligado, em vez de empilhadas no fim.
 *
 * Uma linha anulada é riscada, fica em cinza e recebe um badge — e **não** ganha cor
 * destrutiva: anular é correção, não erro. Ela também perde o botão de anular, que é o
 * outro motivo pelo qual anular duas vezes nunca acontece pela tela.
 *
 * Nenhuma afordância de edição existe em nenhuma linha (D-19): sem lápis, sem duplo clique,
 * sem edição no lugar, sem menu de contexto. Corrigir um valor é anular e lançar de novo.
 */
export function EarningsTable({ entries }: { entries: FinancialEntryListRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Data</TableHead>
          <TableHead className="px-4">Descrição</TableHead>
          <TableHead className="px-4">Forma</TableHead>
          <TableHead className="px-4 text-right">Valor</TableHead>
          <TableHead className="w-10 px-4" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const isVoided = entry.voided_at !== null
          return (
            <TableRow
              key={entry.id}
              className={cn(isVoided && "text-muted-foreground line-through")}
            >
              <TableCell className="px-4 py-3 tabular-nums">
                {toDayMonth(entry.received_on)}
              </TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <TooltipProvider delayDuration={400}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate max-w-[28ch] text-left">
                          {entry.description}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {entry.description}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex items-center gap-2">
                    {entry.case_id && entry.case_label ? (
                      <Link
                        href={`/dashboard/cases/${entry.case_id}`}
                        className="truncate max-w-[28ch] text-xs text-muted-foreground hover:underline"
                      >
                        {entry.case_label}
                      </Link>
                    ) : null}
                    {isVoided ? (
                      <Badge variant="secondary" className="no-underline">
                        Anulado
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge variant="secondary" className="no-underline">
                  {PAYMENT_METHOD_LABEL[entry.payment_method]}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-right tabular-nums font-medium">
                {formatCentsToBRL(entry.amount_cents)}
              </TableCell>
              <TableCell className="w-10 px-4 py-3 text-right">
                {isVoided ? null : (
                  <VoidEntryButton
                    entryId={entry.id}
                    caseId={entry.case_id}
                    amountCents={entry.amount_cents}
                    receivedOn={entry.received_on}
                  />
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EarningsTable } from "@/components/dashboard/earnings/earnings-table"
import { formatCentsToBRL } from "@/lib/formatters"
import type { FinancialEntryListRow } from "@/modules/financial-entries/list-financial-entries"

type CaseEarningsCardProps = {
  /** Os lançamentos do caso, anulados INCLUSOS e já ordenados pelo SQL. */
  entries: FinancialEntryListRow[]
  /** Contagem e soma dos NÃO-anulados, somados no servidor (10-04). */
  count: number
  totalCents: number
}

/**
 * O que foi cobrado neste atendimento (S4).
 *
 * Só existe quando o caso tem lançamento: um caso que nunca foi faturado não deve crescer
 * uma seção, então não há estado vazio nenhum aqui.
 *
 * As linhas são a MESMA tabela do painel de Ganhos — mesmas colunas, mesmo estilo, mesmos
 * rótulos, mesmo componente de anulação, mesma linha riscada com badge para as anuladas.
 * Reusar a tabela em vez de recriar as linhas é o que garante que as duas superfícies não
 * se separem visualmente com o tempo. A única diferença é o link para o caso, que aqui
 * apontaria para a tela atual. Não há filtro de anulados: a lista do caso é curta, e o
 * filtro é do painel.
 *
 * O rodapé mostra a soma que veio do SERVIDOR — este componente não soma dinheiro. A
 * contagem e a soma cobrem só os não-anulados, porque uma linha anulada não é dinheiro.
 *
 * A altura da lista é limitada: um caso com consulta, vários procedimentos e re-lançamentos
 * depois de anulações faria o card crescer sem limite dentro da página de detalhe.
 */
export function CaseEarningsCard({
  entries,
  count,
  totalCents,
}: CaseEarningsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ganhos deste atendimento</CardTitle>
      </CardHeader>
      <div className="max-h-64 overflow-y-auto">
        <EarningsTable entries={entries} hideCaseLink />
      </div>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Total:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatCentsToBRL(totalCents)}
          </span>{" "}
          · {count === 1 ? "1 lançamento" : `${count} lançamentos`}
        </p>
      </CardContent>
    </Card>
  )
}

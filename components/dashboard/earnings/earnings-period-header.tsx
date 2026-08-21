"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type EarningsPeriodHeaderProps = {
  /** Rótulo do período navegado, já formatado no fuso da clínica pelo RSC. */
  periodLabel: string
  /** Falso quando o período navegado não é o mês corrente. */
  isCurrentPeriod: boolean
  /** Mês anterior e seguinte no formato do search param, derivados no RSC. */
  prevMonth: string
  nextMonth: string
  showVoided: boolean
}

/**
 * Header da Faixa B do painel: o navegador de período e o filtro de anulados.
 *
 * Navegar só troca o search param — o RSC re-renderiza com a nova janela e NENHUM fetch
 * acontece no cliente. Os meses vizinhos vêm prontos do servidor, então este componente
 * não constrói data nenhuma (um cliente num host em UTC derivaria o mês errado na virada).
 *
 * Os 28px dos botões de ícone e a altura de 28px do botão fantasma são herdados
 * byte-a-byte do navegador de período da agenda, que já está em produção. Arredondar para
 * a escala de 4px daria ao app dois navegadores de período visualmente diferentes.
 *
 * Quando o período não é o mês corrente, o rótulo sai do cinza — é o quarto mecanismo de
 * escopo duplo do UI-SPEC, e o par dele é o badge da Faixa A.
 */
export function EarningsPeriodHeader({
  periodLabel,
  isCurrentPeriod,
  prevMonth,
  nextMonth,
  showVoided,
}: EarningsPeriodHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(next: { mes?: string | null; anulados?: boolean }) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.mes === null) params.delete("mes")
    else if (next.mes !== undefined) params.set("mes", next.mes)
    if (next.anulados === true) params.set("anulados", "1")
    else if (next.anulados === false) params.delete("anulados")
    const query = params.toString()
    router.push(query ? `/dashboard/earnings?${query}` : "/dashboard/earnings")
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <h2 className="mr-2 text-sm font-medium text-muted-foreground">Período</h2>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={() => navigate({ mes: prevMonth })}
          aria-label="Anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => navigate({ mes: null })}
        >
          Hoje
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={() => navigate({ mes: nextMonth })}
          aria-label="Próximo"
        >
          <ChevronRight className="size-4" />
        </Button>
        <span
          className={cn(
            "ml-1 text-sm",
            isCurrentPeriod
              ? "font-medium text-muted-foreground"
              : "font-medium text-foreground",
          )}
        >
          {periodLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="mostrar-anulados"
          checked={showVoided}
          onCheckedChange={(checked) => navigate({ anulados: checked === true })}
        />
        <Label htmlFor="mostrar-anulados" className="text-sm font-normal">
          mostrar anulados
        </Label>
      </div>
    </div>
  )
}

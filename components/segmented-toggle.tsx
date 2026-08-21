import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Botão segmentado com estado pressionado acessível — token oklch, sem deps novas.
 *
 * Cópia verbatim do helper `Segment` de `components/dashboard/agenda/availability-panel.tsx`.
 * O padding vertical de 6px é exceção herdada de um controle já em produção: arredondar
 * para 8px produziria duas versões visualmente diferentes do MESMO controle no app.
 *
 * `availability-panel.tsx` NÃO foi re-apontado para cá de propósito — duplicar 20 linhas é
 * mais barato que arriscar regressão visual num controle da agenda fora do escopo desta fase.
 */
export function SegmentedToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  )
}

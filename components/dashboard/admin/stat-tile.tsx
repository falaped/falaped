import { cn } from "@/lib/utils"

/**
 * Número seco com rótulo, no mesmo desenho dos cards de "Números da conta" do Início.
 * Zero fica apagado para a leitura pular direto no que tem movimento.
 */
export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: number | string
  hint?: string
  className?: string
}) {
  const isZero = value === 0

  return (
    <div className={cn("rounded-lg bg-muted/50 px-3 py-2.5 ring-1 ring-foreground/10", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums tracking-tight",
          isZero && "text-muted-foreground/40",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

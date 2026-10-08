import type { LucideIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const KIND = {
  danger: "border-transparent bg-destructive text-destructive-foreground shadow-xs",
  warning: "border-warning-border bg-warning-soft text-warning-text",
} as const

/** Símbolo redondo do guia ("Selos e símbolos"): hover ou foco mostra o título e o detalhe. */
export function AttentionSymbol({
  icon: Icon,
  kind,
  title,
  detail,
}: {
  icon: LucideIcon
  kind: keyof typeof KIND
  title: string
  detail: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`${title}: ${detail}`}
          className={cn("relative grid size-7 shrink-0 place-items-center rounded-full border", KIND[kind])}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <span className="font-semibold">{title}</span>
        <span className="block">{detail}</span>
      </TooltipContent>
    </Tooltip>
  )
}

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Vertical stack spacing for the case detail page shell. */
export const caseDetailMainStackClassName = "flex flex-col gap-6"

/** Two-column layout for conversation vs report on large screens. */
export const caseDetailTwoColumnGridClassName =
  "grid gap-6 lg:grid-cols-2 lg:items-start"

type CaseDetailWorkspaceTwoColumnProps = {
  /** Typically conversation / chat column. */
  primaryColumn: ReactNode
  /** Typically report + related links. */
  secondaryColumn: ReactNode
  className?: string
}

/**
 * RSC-friendly layout wrapper: single column on small viewports, two columns from `lg`.
 */
export function CaseDetailWorkspaceTwoColumn({
  primaryColumn,
  secondaryColumn,
  className,
}: CaseDetailWorkspaceTwoColumnProps) {
  return (
    <div className={cn(caseDetailTwoColumnGridClassName, className)}>
      <div className="flex min-w-0 flex-col gap-6">{primaryColumn}</div>
      <div className="flex min-w-0 flex-col gap-6">{secondaryColumn}</div>
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"

export type CaseStatusFilterValue = "active" | "closed"

const statusOptions: { value: CaseStatusFilterValue; label: string }[] = [
  { value: "active", label: "Ativo" },
  { value: "closed", label: "Encerrados" },
]

export type CaseCounts = { active: number; closed: number }

export function CaseStatusFilter({
  value,
  onChange,
  counts,
}: {
  value: CaseStatusFilterValue
  onChange: (value: CaseStatusFilterValue) => void
  counts: CaseCounts
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
      {statusOptions.map((opt) => {
        const isActive = value === opt.value
        const count = counts[opt.value]
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

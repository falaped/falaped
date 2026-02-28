"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

const statusOptions = [
  { value: "active" as const, label: "Ativos" },
  { value: "closed" as const, label: "Encerrados" },
  { value: "all" as const, label: "Todos" },
] as const

export function CaseStatusFilter({ counts }: { counts?: { active: number; closed: number; all: number } }) {
  const searchParams = useSearchParams()
  const current = (searchParams.get("status") ?? "active") as "active" | "closed" | "all"
  const resolved = statusOptions.some((o) => o.value === current) ? current : "active"

  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
      {statusOptions.map((opt) => {
        const isActive = resolved === opt.value
        const count = counts?.[opt.value]
        return (
          <Link
            key={opt.value}
            href={`/dashboard/cases${opt.value === "active" ? "" : `?status=${opt.value}`}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
            {count !== undefined && (
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
            )}
          </Link>
        )
      })}
    </div>
  )
}

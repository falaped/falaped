"use client"

import { subMonths, subWeeks, subYears } from "date-fns"
import { useMemo, useState } from "react"

import { DiscussionList } from "@/components/dashboard/discussions/discussion-list"
import { DiscussionSearchInput } from "@/components/dashboard/discussions/discussion-search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DiscussionWithMessages } from "@/modules/discussions/get-discussions-by-profile-id"

export type DiscussionPeriodValue = "all" | "1w" | "1m" | "2m" | "3m" | "6m" | "2y"

const PERIOD_OPTIONS: { value: DiscussionPeriodValue; label: string }[] = [
  { value: "all", label: "Todos os períodos" },
  { value: "1w", label: "1 semana" },
  { value: "1m", label: "1 mês" },
  { value: "2m", label: "2 meses" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "2y", label: "2 anos" },
]

function getPeriodCutoff(value: DiscussionPeriodValue): Date | null {
  const now = new Date()
  switch (value) {
    case "all":
      return null
    case "1w":
      return subWeeks(now, 1)
    case "1m":
      return subMonths(now, 1)
    case "2m":
      return subMonths(now, 2)
    case "3m":
      return subMonths(now, 3)
    case "6m":
      return subMonths(now, 6)
    case "2y":
      return subYears(now, 2)
    default:
      return null
  }
}

function filterByTitle(
  list: DiscussionWithMessages[],
  search: string
): DiscussionWithMessages[] {
  if (!search.trim()) return list
  const term = search.toLowerCase().trim()
  return list.filter((d) => {
    const title = d.title?.toLowerCase() ?? ""
    return title.includes(term)
  })
}

function filterByPeriod(
  list: DiscussionWithMessages[],
  period: DiscussionPeriodValue
): DiscussionWithMessages[] {
  const cutoff = getPeriodCutoff(period)
  if (!cutoff) return list
  const cutoffTime = cutoff.getTime()
  return list.filter((d) => new Date(d.started_at).getTime() >= cutoffTime)
}

export function DiscussionsToolbarAndList({
  discussions,
}: {
  discussions: DiscussionWithMessages[]
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [period, setPeriod] = useState<DiscussionPeriodValue>("all")

  const sortedDiscussions = useMemo(() => {
    return [...discussions].sort((a, b) => {
      const order = (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1)
      if (order !== 0) return order
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    })
  }, [discussions])

  const filteredDiscussions = useMemo(
    () =>
      filterByPeriod(
        filterByTitle(sortedDiscussions, searchQuery),
        period
      ),
    [sortedDiscussions, searchQuery, period]
  )

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <DiscussionSearchInput value={searchQuery} onChange={setSearchQuery} />
        <Select
          value={period}
          onValueChange={(v) => setPeriod(v as DiscussionPeriodValue)}
        >
          <SelectTrigger className="w-[180px]" aria-label="Período">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DiscussionList discussions={filteredDiscussions} />
    </>
  )
}

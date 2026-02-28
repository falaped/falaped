"use client"

import { useMemo } from "react"

import { CaseCard } from "@/components/dashboard/case-card"
import { CaseEmptyState } from "@/components/dashboard/case-empty-state"
import type { CaseWithPatient } from "@/modules/cases/get-cases-by-user-phone"

type CaseStatusFilterValue = "active" | "closed" | "all"

function filterCasesBySearch(cases: CaseWithPatient[], search: string): CaseWithPatient[] {
  if (!search.trim()) return cases
  const term = search.toLowerCase().trim()
  return cases.filter((c) => {
    const patientName = c.patient?.name?.toLowerCase() ?? ""
    const responsible = c.patient?.responsible?.toLowerCase() ?? ""
    return patientName.includes(term) || responsible.includes(term)
  })
}

export function CaseList({
  cases,
  statusFilter = "active",
  searchQuery = "",
}: {
  cases: CaseWithPatient[]
  statusFilter?: CaseStatusFilterValue
  searchQuery?: string
}) {
  const filteredCases = useMemo(
    () => filterCasesBySearch(cases, searchQuery),
    [cases, searchQuery],
  )

  if (filteredCases.length === 0) {
    if (searchQuery.trim()) {
      return <CaseEmptyState statusFilter="search" />
    }
    return <CaseEmptyState statusFilter={statusFilter} />
  }

  return (
    <div className="flex flex-col gap-3">
      {filteredCases.map((c) => (
        <CaseCard key={c.id} case_={c} />
      ))}
    </div>
  )
}

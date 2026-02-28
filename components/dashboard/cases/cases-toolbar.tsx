"use client"

import { useMemo, useState } from "react"

import { CaseStatusFilter, type CaseStatusFilterValue, type CaseCounts } from "@/components/dashboard/cases/case-status-filter"
import { CaseSearchInput } from "@/components/dashboard/cases/case-search-input"
import { CaseList } from "@/components/dashboard/cases/case-list"
import type { CaseWithPatient } from "@/modules/cases/get-cases-by-user-phone"

function filterBySearch(cases: CaseWithPatient[], search: string): CaseWithPatient[] {
  if (!search.trim()) return cases
  const term = search.toLowerCase().trim()
  return cases.filter((c) => {
    const patientName = c.patient?.name?.toLowerCase() ?? ""
    const responsible = c.patient?.responsible?.toLowerCase() ?? ""
    return patientName.includes(term) || responsible.includes(term)
  })
}

export function CasesToolbarAndList({ cases }: { cases: CaseWithPatient[] }) {
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilterValue>("active")
  const [searchQuery, setSearchQuery] = useState("")

  const counts: CaseCounts = useMemo(
    () => ({
      active: cases.filter((c) => c.status === "active").length,
      closed: cases.filter((c) => c.status === "closed").length,
    }),
    [cases],
  )

  const filteredCases = useMemo(() => {
    const byStatus = cases.filter((c) => c.status === statusFilter)
    return filterBySearch(byStatus, searchQuery)
  }, [cases, statusFilter, searchQuery])

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CaseStatusFilter value={statusFilter} onChange={setStatusFilter} counts={counts} />
        <CaseSearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>
      <CaseList cases={filteredCases} />
    </>
  )
}

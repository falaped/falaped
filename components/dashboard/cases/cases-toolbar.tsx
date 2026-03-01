"use client"

import { useMemo, useState } from "react"

import { CaseSearchInput } from "@/components/dashboard/cases/case-search-input"
import { CaseList } from "@/components/dashboard/cases/case-list"
import type { CaseWithPatient } from "@/modules/cases/get-cases-by-profile-id"

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
  const [searchQuery, setSearchQuery] = useState("")

  const sortedCases = useMemo(() => {
    return [...cases].sort((a, b) => {
      const order = (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1)
      if (order !== 0) return order
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    })
  }, [cases])

  const filteredCases = useMemo(
    () => filterBySearch(sortedCases, searchQuery),
    [sortedCases, searchQuery],
  )

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <CaseSearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>
      <CaseList cases={filteredCases} />
    </>
  )
}

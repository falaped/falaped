"use client"

import { useMemo, useState } from "react"

import { CaseEmptyState } from "@/components/dashboard/cases/case-empty-state"
import { CaseSearchInput } from "@/components/dashboard/cases/case-search-input"
import { CasesTable } from "@/components/dashboard/cases/cases-table"
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

  if (sortedCases.length === 0) {
    return <CaseEmptyState />
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <CaseSearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>
      {filteredCases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium text-muted-foreground">Nenhum resultado encontrado.</p>
          <p className="mt-1 text-sm text-muted-foreground/80">
            Tente outro termo de busca ou limpe o filtro.
          </p>
        </div>
      ) : (
        <CasesTable cases={filteredCases} />
      )}
    </>
  )
}

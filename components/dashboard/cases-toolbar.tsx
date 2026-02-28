"use client"

import { useState } from "react"

import { CaseStatusFilter } from "@/components/dashboard/case-status-filter"
import { CaseSearchInput } from "@/components/dashboard/case-search-input"
import { CaseList } from "@/components/dashboard/case-list"
import type { CaseWithPatient } from "@/modules/cases/get-cases-by-user-phone"
import type { CaseCounts } from "@/modules/cases/get-case-counts-by-user-phone"

type CaseStatusFilterValue = "active" | "closed" | "all"

export function CasesToolbarAndList({
  cases,
  counts,
  statusFilter,
}: {
  cases: CaseWithPatient[]
  counts: CaseCounts
  statusFilter: CaseStatusFilterValue
}) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CaseStatusFilter counts={counts} />
        <CaseSearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>
      <CaseList cases={cases} statusFilter={statusFilter} searchQuery={searchQuery} />
    </>
  )
}

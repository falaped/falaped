"use client"

import { CaseCard } from "@/components/dashboard/cases/case-card"
import { CaseEmptyState } from "@/components/dashboard/cases/case-empty-state"
import type { CaseWithPatient } from "@/modules/cases/get-cases-by-profile-id"

export function CaseList({ cases }: { cases: CaseWithPatient[] }) {
  if (cases.length === 0) {
    return <CaseEmptyState />
  }

  return (
    <div className="flex flex-col gap-3">
      {cases.map((c) => (
        <CaseCard key={c.id} case_={c} />
      ))}
    </div>
  )
}

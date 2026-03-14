"use client"

import { useMemo, useState } from "react"
import { ReportTemplateList } from "@/components/dashboard/report-templates/report-template-list"
import { ReportTemplateSearchInput } from "@/components/dashboard/report-templates/report-template-search-input"
import type { ReportTemplateOption } from "@/modules/report-templates/get-report-templates-by-profile-id"

function filterBySearch(
  templates: ReportTemplateOption[],
  search: string
): ReportTemplateOption[] {
  if (!search.trim()) return templates
  const term = search.toLowerCase().trim()
  return templates.filter((t) =>
    (t.name ?? "").toLowerCase().includes(term)
  )
}

export function ReportTemplatesToolbarAndList({
  templates,
  activeTemplateId,
}: {
  templates: ReportTemplateOption[]
  activeTemplateId: string | null
}) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTemplates = useMemo(
    () => filterBySearch(templates, searchQuery),
    [templates, searchQuery]
  )

  return (
    <>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <ReportTemplateSearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>
      <ReportTemplateList
        templates={filteredTemplates}
        activeTemplateId={activeTemplateId}
      />
    </>
  )
}

"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ReportTemplateSearchInput } from "@/components/dashboard/report-templates/report-template-search-input"
import { ReportTemplateTable } from "@/components/dashboard/report-templates/report-template-table"
import type { ReportTemplateOption } from "@/modules/report-templates/get-report-templates-by-profile-id"

function filterBySearch(
  templates: ReportTemplateOption[],
  search: string,
): ReportTemplateOption[] {
  if (!search.trim()) return templates
  const term = search.toLowerCase().trim()
  return templates.filter((t) =>
    (t.name ?? "").toLowerCase().includes(term),
  )
}

type ReportTemplatesTableSectionProps = {
  templates: ReportTemplateOption[]
  activeTemplateId: string | null
}

export function ReportTemplatesTableSection({
  templates,
  activeTemplateId,
}: ReportTemplatesTableSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTemplates = useMemo(
    () => filterBySearch(templates, searchQuery),
    [templates, searchQuery],
  )

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
          <ReportTemplateSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        <ReportTemplateTable
          templates={filteredTemplates}
          activeTemplateId={activeTemplateId}
        />
      </CardContent>
    </Card>
  )
}

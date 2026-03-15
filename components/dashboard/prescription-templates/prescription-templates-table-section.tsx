"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PrescriptionTemplateSearchInput } from "@/components/dashboard/prescription-templates/prescription-template-search-input"
import { PrescriptionTemplateTable } from "@/components/dashboard/prescription-templates/prescription-template-table"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"

function filterBySearch(
  templates: PrescriptionTemplateOption[],
  search: string,
): PrescriptionTemplateOption[] {
  if (!search.trim()) return templates
  const term = search.toLowerCase().trim()
  return templates.filter((t) =>
    (t.name ?? "").toLowerCase().includes(term),
  )
}

type PrescriptionTemplatesTableSectionProps = {
  templates: PrescriptionTemplateOption[]
}

export function PrescriptionTemplatesTableSection({
  templates,
}: PrescriptionTemplatesTableSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTemplates = useMemo(
    () => filterBySearch(templates, searchQuery),
    [templates, searchQuery],
  )

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
          <PrescriptionTemplateSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        <PrescriptionTemplateTable templates={filteredTemplates} />
      </CardContent>
    </Card>
  )
}

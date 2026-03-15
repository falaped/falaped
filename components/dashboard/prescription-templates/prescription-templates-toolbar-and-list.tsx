"use client"

import { useMemo, useState } from "react"
import { PrescriptionTemplateList } from "@/components/dashboard/prescription-templates/prescription-template-list"
import { PrescriptionTemplateSearchInput } from "@/components/dashboard/prescription-templates/prescription-template-search-input"
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

export function PrescriptionTemplatesToolbarAndList({
  templates,
}: {
  templates: PrescriptionTemplateOption[]
}) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTemplates = useMemo(
    () => filterBySearch(templates, searchQuery),
    [templates, searchQuery],
  )

  return (
    <>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <PrescriptionTemplateSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <PrescriptionTemplateList templates={filteredTemplates} />
    </>
  )
}

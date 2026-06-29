"use client"

import { useMemo, useState } from "react"

import { CaseSearchInput } from "@/components/dashboard/cases/case-search-input"
import { PatientEmptyState } from "@/components/dashboard/patients/patient-empty-state"
import { PatientsTable } from "@/components/dashboard/patients/patients-table"
import type { Patient } from "@/modules/patients/types"

/** Patient enriquecido com a signed URL resolvida server-side (lista). */
type PatientWithPhoto = Patient & { photoUrl?: string | null }

function filterBySearch(
  patients: PatientWithPhoto[],
  search: string,
): PatientWithPhoto[] {
  if (!search.trim()) return patients
  const term = search.toLowerCase().trim()
  return patients.filter((p) => {
    const name = p.name?.toLowerCase() ?? ""
    const responsible = p.responsible?.toLowerCase() ?? ""
    return name.includes(term) || responsible.includes(term)
  })
}

export function PatientsToolbarAndList({
  patients,
}: {
  patients: PatientWithPhoto[]
}) {
  const [searchQuery, setSearchQuery] = useState("")

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    )
  }, [patients])

  const filteredPatients = useMemo(
    () => filterBySearch(sortedPatients, searchQuery),
    [sortedPatients, searchQuery],
  )

  if (sortedPatients.length === 0) {
    return <PatientEmptyState />
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <CaseSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por nome ou responsável..."
          aria-label="Buscar paciente por nome ou responsável"
        />
      </div>

      {filteredPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium text-muted-foreground">Nenhum resultado encontrado.</p>
          <p className="mt-1 text-sm text-muted-foreground/80">
            Tente outro termo de busca ou limpe o filtro.
          </p>
        </div>
      ) : (
        <PatientsTable patients={filteredPatients} />
      )}
    </>
  )
}

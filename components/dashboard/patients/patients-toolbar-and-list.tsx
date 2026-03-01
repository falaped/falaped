"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PatientCard } from "@/components/dashboard/patients/patient-card"
import { PatientEmptyState } from "@/components/dashboard/patients/patient-empty-state"
import { PatientSearchInput } from "@/components/dashboard/patients/patient-search-input"
import type { Patient } from "@/modules/patients/types"

function filterBySearch(patients: Patient[], search: string): Patient[] {
  if (!search.trim()) return patients
  const term = search.toLowerCase().trim()
  return patients.filter((p) => {
    const name = p.name?.toLowerCase() ?? ""
    const responsible = p.responsible?.toLowerCase() ?? ""
    return name.includes(term) || responsible.includes(term)
  })
}

export function PatientsToolbarAndList({ patients }: { patients: Patient[] }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPatients = useMemo(
    () => filterBySearch(patients, searchQuery),
    [patients, searchQuery]
  )

  if (patients.length === 0) {
    return <PatientEmptyState />
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PatientSearchInput value={searchQuery} onChange={setSearchQuery} />
        <Button asChild>
          <Link href="/dashboard/patients/novo">Cadastrar paciente</Link>
        </Button>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium text-muted-foreground">
            Nenhum resultado encontrado.
          </p>
          <p className="mt-1 text-sm text-muted-foreground/80">
            Tente outro termo de busca ou limpe o filtro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          {filteredPatients.map((p) => (
            <PatientCard key={p.id} patient={p} />
          ))}
        </div>
      )}
    </>
  )
}

import { Suspense } from "react"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { VaccinesContent } from "@/components/dashboard/vaccines/vaccines-content"

export const metadata = { title: "Vacinas" }

export default function VaccinesPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando vacinas" />}>
      <VaccinesContent searchParams={searchParams} />
    </Suspense>
  )
}

import { Suspense } from "react"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { TemplatesContent } from "@/components/dashboard/templates/templates-content"

export const metadata = { title: "Modelos" }

export default function TemplatesPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando modelos" />}>
      <TemplatesContent searchParams={searchParams} />
    </Suspense>
  )
}

import { Suspense } from "react"

import { SelectPatientLoading } from "@/components/dashboard/cases/select-patient-loading"

import { SelectPatientContent } from "./select-patient-content"

export default function SelectPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>
}) {
  return (
    <Suspense fallback={<SelectPatientLoading />}>
      <SelectPatientContent searchParams={searchParams} />
    </Suspense>
  )
}

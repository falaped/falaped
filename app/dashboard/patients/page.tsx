import { Suspense } from "react"

import { PatientsContent } from "@/components/dashboard/patients/patients-content"
import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"

export default function PatientsPage() {
  return (
    <Suspense fallback={<PatientsLoading />}>
      <PatientsContent />
    </Suspense>
  )
}

import { Suspense } from "react"
import { PatientDetailContent } from "@/components/dashboard/patients/patient-detail-content"
import { PatientDetailLoading } from "@/components/dashboard/patients/patient-detail-loading"

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<PatientDetailLoading />}>
      <PatientDetailContent id={id} />
    </Suspense>
  )
}

import { Suspense } from "react"
import { PatientEditContent } from "@/components/dashboard/patients/patient-edit-content"
import { Skeleton } from "@/components/ui/skeleton"

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<Skeleton className="h-28 w-full max-w-[1440px] rounded-xl" />}>
      <PatientEditContent id={id} />
    </Suspense>
  )
}

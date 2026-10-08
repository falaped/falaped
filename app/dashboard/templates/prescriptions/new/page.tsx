import { Suspense } from "react"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { loadTemplatePage } from "@/components/dashboard/templates/load-template-page"
import { PrescriptionTemplateForm } from "@/components/dashboard/templates/prescription-template-form"

export const metadata = { title: "Novo modelo de receita" }

export default function NewPrescriptionTemplatePage() {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando modelo" />}>
      <NewPrescriptionTemplate />
    </Suspense>
  )
}

async function NewPrescriptionTemplate() {
  const { doctor } = await loadTemplatePage()
  return <PrescriptionTemplateForm doctor={doctor} />
}

import { Suspense } from "react"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { loadTemplatePage } from "@/components/dashboard/templates/load-template-page"
import { PrescriptionTemplateGenerate } from "@/components/dashboard/templates/template-generate"

export const metadata = { title: "Gerar receita com IA" }

export default function GeneratePrescriptionTemplatePage() {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando" />}>
      <GeneratePrescriptionTemplate />
    </Suspense>
  )
}

async function GeneratePrescriptionTemplate() {
  const { doctor } = await loadTemplatePage()
  return <PrescriptionTemplateGenerate doctor={doctor} />
}

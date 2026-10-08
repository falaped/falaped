import { Suspense } from "react"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { ExamPanelForm } from "@/components/dashboard/templates/exam-panel-form"
import { loadTemplatePage } from "@/components/dashboard/templates/load-template-page"
import { getExamCatalogItems } from "@/modules/exam-catalog/get-exam-catalog-items"

export const metadata = { title: "Novo modelo de exames" }

export default function NewExamPanelPage() {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando modelo" />}>
      <NewExamPanel />
    </Suspense>
  )
}

async function NewExamPanel() {
  const { supabase, profileId, doctor } = await loadTemplatePage()
  const catalog = await getExamCatalogItems(supabase, profileId)
  return <ExamPanelForm catalog={catalog} doctor={doctor} />
}

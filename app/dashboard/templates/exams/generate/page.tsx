import { Suspense } from "react"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { loadTemplatePage } from "@/components/dashboard/templates/load-template-page"
import { ExamPanelGenerate } from "@/components/dashboard/templates/template-generate"
import { getExamCatalogItems } from "@/modules/exam-catalog/get-exam-catalog-items"

export const metadata = { title: "Gerar exames com IA" }

export default function GenerateExamPanelPage() {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando" />}>
      <GenerateExamPanel />
    </Suspense>
  )
}

async function GenerateExamPanel() {
  const { supabase, profileId, doctor } = await loadTemplatePage()
  const catalog = await getExamCatalogItems(supabase, profileId)
  return <ExamPanelGenerate catalog={catalog} doctor={doctor} />
}

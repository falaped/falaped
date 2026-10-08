import { Suspense } from "react"
import { notFound } from "next/navigation"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { ExamPanelForm } from "@/components/dashboard/templates/exam-panel-form"
import { loadTemplatePage } from "@/components/dashboard/templates/load-template-page"
import { getExamCatalogItems } from "@/modules/exam-catalog/get-exam-catalog-items"
import { getExamPanelsByProfileId } from "@/modules/exam-panels/get-exam-panels-by-profile-id"

export const metadata = { title: "Editar modelo de exames" }

type Params = Promise<{ id: string }>

export default function EditExamPanelPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando modelo" />}>
      <EditExamPanel params={params} />
    </Suspense>
  )
}

/** A lista já é escopada ao médico: um id de outro médico não é achado e dá 404. */
async function EditExamPanel({ params }: { params: Params }) {
  const { id } = await params
  const { supabase, profileId, doctor } = await loadTemplatePage()
  const [panels, catalog] = await Promise.all([getExamPanelsByProfileId(supabase, profileId), getExamCatalogItems(supabase, profileId)])
  const panel = panels.find((p) => p.id === id)
  if (!panel) notFound()
  return <ExamPanelForm panelId={panel.id} initialName={panel.name} initialExams={panel.panel_items} catalog={catalog} doctor={doctor} />
}

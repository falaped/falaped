import { Suspense } from "react"
import { notFound } from "next/navigation"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { loadTemplatePage } from "@/components/dashboard/templates/load-template-page"
import { PrescriptionTemplateForm } from "@/components/dashboard/templates/prescription-template-form"
import { getPrescriptionTemplateByIdForProfile } from "@/modules/prescription-templates/get-prescription-template-by-id-for-profile"

export const metadata = { title: "Editar modelo de receita" }

type Params = Promise<{ id: string }>

export default function EditPrescriptionTemplatePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando modelo" />}>
      <EditPrescriptionTemplate params={params} />
    </Suspense>
  )
}

async function EditPrescriptionTemplate({ params }: { params: Params }) {
  const { id } = await params
  const { supabase, profileId, doctor } = await loadTemplatePage()
  const template = await getPrescriptionTemplateByIdForProfile(supabase, id, profileId)
  if (!template) notFound()
  return <PrescriptionTemplateForm templateId={template.id} initialName={template.name} initialSnapshot={template.snapshot} doctor={doctor} />
}

import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { ReportTemplateForm } from "@/components/dashboard/report-templates/report-template-form"
import { createClient } from "@/lib/supabase/server"
import { getReportTemplateByIdForProfile } from "@/modules/report-templates/get-report-template-by-id-for-profile"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export const metadata = { title: "Editar modelo de relatório" }

type Params = Promise<{ id: string }>

export default function EditReportTemplatePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando modelo" />}>
      <EditReportTemplate params={params} />
    </Suspense>
  )
}

/** Só o dono edita; o modelo do Falaped e o de outro médico dão 404. */
async function EditReportTemplate({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const template = await getReportTemplateByIdForProfile(supabase, id, profile.id)
  if (!template) notFound()

  return <ReportTemplateForm mode="edit" templateId={template.id} initialName={template.name} initialTemplateSections={template.sections} />
}

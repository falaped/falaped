import { Suspense } from "react"
import { redirect } from "next/navigation"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { ReportTemplateForm } from "@/components/dashboard/report-templates/report-template-form"
import { createClient } from "@/lib/supabase/server"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"
import { getReportTemplatesByProfileId } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export const metadata = { title: "Novo modelo de relatório" }

type SearchParams = Promise<{ duplicar?: string }>

export default function NewReportTemplatePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando modelo" />}>
      <NewReportTemplate searchParams={searchParams} />
    </Suspense>
  )
}

/** `?duplicar=` parte de um modelo do médico ou do Falaped (só os que ele pode ver). */
async function NewReportTemplate({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const { duplicar } = await searchParams
  const source = duplicar ? (await getReportTemplatesByProfileId(supabase, profile.id)).find((t) => t.id === duplicar) : undefined

  return (
    <ReportTemplateForm
      mode="create"
      initialName={source ? `${source.name} (cópia)` : undefined}
      initialTemplateSections={source?.sections as ReportTemplateSection[] | undefined}
    />
  )
}

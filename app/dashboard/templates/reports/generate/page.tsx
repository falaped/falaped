import { Suspense } from "react"
import { redirect } from "next/navigation"

import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { GenerateWithAiContent } from "@/components/dashboard/report-templates/generate-with-ai-content"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

export const metadata = { title: "Gerar modelo com IA" }

export default function GenerateReportTemplatePage() {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando" />}>
      <GenerateReportTemplate />
    </Suspense>
  )
}

async function GenerateReportTemplate() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")
  return <GenerateWithAiContent />
}

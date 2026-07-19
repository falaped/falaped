import { redirect } from "next/navigation"
import Link from "next/link"
import { FlaskConical, ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getExamCatalogItems } from "@/modules/exam-catalog/get-exam-catalog-items"
import { getExamPanelsByProfileId } from "@/modules/exam-panels/get-exam-panels-by-profile-id"
import { getExamRequestTemplatesByProfileId } from "@/modules/exam-request-templates/get-exam-request-templates-by-profile-id"
import { getExamRequestTemplateByIdForProfile } from "@/modules/exam-request-templates/get-exam-request-template-by-id-for-profile"
import { ExamRequestWizardWrapper } from "./exam-request-wizard-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type PageProps = {
  searchParams: Promise<{
    templateId?: string
    patientId?: string
    caseId?: string
  }>
}

export default async function NewExamRequestPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const [patients, examCatalogItems, examPanels, examRequestTemplates] =
    await Promise.all([
      getPatientsByProfileId(supabase, profile.id),
      getExamCatalogItems(supabase, profile.id),
      getExamPanelsByProfileId(supabase, profile.id),
      getExamRequestTemplatesByProfileId(supabase, profile.id),
    ])

  const resolved = await searchParams
  const templateId = resolved.templateId
  const patientId =
    resolved.patientId && typeof resolved.patientId === "string"
      ? resolved.patientId
      : null
  const caseId =
    resolved.caseId && typeof resolved.caseId === "string"
      ? resolved.caseId
      : null
  const initialTemplate =
    templateId && typeof templateId === "string"
      ? await getExamRequestTemplateByIdForProfile(
          supabase,
          templateId,
          profile.id,
        )
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" asChild aria-label="Voltar">
              <Link href="/dashboard/exam-requests">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Novo pedido de exames
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Associe a um paciente ou preencha manualmente. Busque exames no
            catálogo, aplique painéis e gere o PDF.
          </p>
        </div>
      </div>

      <Separator />

      <ExamRequestWizardWrapper
        patients={patients}
        profile={profile}
        examCatalogItems={examCatalogItems}
        examPanels={examPanels}
        examRequestTemplates={examRequestTemplates}
        initialTemplate={initialTemplate}
        initialPatientId={patientId}
        initialCaseId={caseId}
      />
    </div>
  )
}

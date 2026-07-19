import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getMedicalReportTemplatesByProfileId } from "@/modules/medical-report-templates/get-medical-report-templates-by-profile-id"
import { getMedicalReportTemplateByIdForProfile } from "@/modules/medical-report-templates/get-medical-report-template-by-id-for-profile"
import { MedicalReportWizardWrapper } from "./medical-report-wizard-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type PageProps = {
  searchParams: Promise<{
    templateId?: string
    patientId?: string
    caseId?: string
  }>
}

export default async function NewMedicalReportPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const [patients, medicalReportTemplates] = await Promise.all([
    getPatientsByProfileId(supabase, profile.id),
    getMedicalReportTemplatesByProfileId(supabase, profile.id),
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
      ? await getMedicalReportTemplateByIdForProfile(
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
              <Link href="/dashboard/medical-reports">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Novo relatório médico
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Associe a um paciente ou preencha manualmente. Informe o título e
            escreva o corpo do relatório para gerar o PDF.
          </p>
        </div>
      </div>

      <Separator />

      <MedicalReportWizardWrapper
        patients={patients}
        profile={profile}
        medicalReportTemplates={medicalReportTemplates}
        initialTemplate={initialTemplate}
        initialPatientId={patientId}
        initialCaseId={caseId}
      />
    </div>
  )
}

import { redirect } from "next/navigation"
import Link from "next/link"
import { Pill, ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getPrescriptionTemplatesByProfileId } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import { getPrescriptionTemplateByIdForProfile } from "@/modules/prescription-templates/get-prescription-template-by-id-for-profile"
import { PrescriptionWizardWrapper } from "./prescription-wizard-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type PageProps = {
  searchParams: Promise<{
    templateId?: string
    patientId?: string
    caseId?: string
  }>
}

export default async function NewPrescriptionPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const [patients, prescriptionTemplates] = await Promise.all([
    getPatientsByProfileId(supabase, profile.id),
    getPrescriptionTemplatesByProfileId(supabase, profile.id),
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
      ? await getPrescriptionTemplateByIdForProfile(
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
              <Link href="/dashboard/prescriptions">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Pill className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Nova receita
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Associe a um paciente ou preencha manualmente. Adicione os medicamentos e gere o PDF.
          </p>
        </div>
      </div>

      <Separator />

      <PrescriptionWizardWrapper
        patients={patients}
        profile={profile}
        prescriptionTemplates={prescriptionTemplates}
        initialTemplate={initialTemplate}
        initialPatientId={patientId}
        initialCaseId={caseId}
      />
    </div>
  )
}

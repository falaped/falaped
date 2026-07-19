import { redirect } from "next/navigation"
import Link from "next/link"
import { Share2, ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getReferralTemplatesByProfileId } from "@/modules/referral-templates/get-referral-templates-by-profile-id"
import { getReferralTemplateByIdForProfile } from "@/modules/referral-templates/get-referral-template-by-id-for-profile"
import { ReferralWizardWrapper } from "./referral-wizard-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type PageProps = {
  searchParams: Promise<{
    templateId?: string
    patientId?: string
    caseId?: string
  }>
}

export default async function NewReferralPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const [patients, referralTemplates] = await Promise.all([
    getPatientsByProfileId(supabase, profile.id),
    getReferralTemplatesByProfileId(supabase, profile.id),
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
      ? await getReferralTemplateByIdForProfile(supabase, templateId, profile.id)
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" asChild aria-label="Voltar">
              <Link href="/dashboard/referrals">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Share2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Novo encaminhamento
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Associe a um paciente ou preencha manualmente. Informe a especialidade,
            o motivo e a urgência e gere o PDF.
          </p>
        </div>
      </div>

      <Separator />

      <ReferralWizardWrapper
        patients={patients}
        profile={profile}
        referralTemplates={referralTemplates}
        initialTemplate={initialTemplate}
        initialPatientId={patientId}
        initialCaseId={caseId}
      />
    </div>
  )
}

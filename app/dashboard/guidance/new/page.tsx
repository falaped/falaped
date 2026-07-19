import { redirect } from "next/navigation"
import Link from "next/link"
import { BookOpen, ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getGuidanceTemplatesByProfileId } from "@/modules/guidance/get-guidance-templates-by-profile-id"
import { GuidanceWizardWrapper } from "./guidance-wizard-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type PageProps = {
  searchParams: Promise<{
    patientId?: string
    caseId?: string
  }>
}

export default async function NewGuidancePage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const [patients, templates] = await Promise.all([
    getPatientsByProfileId(supabase, profile.id),
    getGuidanceTemplatesByProfileId(supabase, profile.id),
  ])

  const resolved = await searchParams
  const patientId =
    resolved.patientId && typeof resolved.patientId === "string"
      ? resolved.patientId
      : null
  const caseId =
    resolved.caseId && typeof resolved.caseId === "string"
      ? resolved.caseId
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" asChild aria-label="Voltar">
              <Link href="/dashboard/guidance">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Gerar orientação
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Associe um paciente, selecione um marco e gere o PDF de orientação.
          </p>
        </div>
      </div>

      <Separator />

      <GuidanceWizardWrapper
        patients={patients}
        profile={profile}
        templates={templates}
        initialPatientId={patientId}
        initialCaseId={caseId}
      />
    </div>
  )
}

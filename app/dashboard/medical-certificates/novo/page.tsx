import { redirect } from "next/navigation"
import Link from "next/link"
import { FileCheck, ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { MedicalCertificateWizard } from "@/components/dashboard/medical-certificates/medical-certificate-wizard"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default async function NewMedicalCertificatePage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const patients = await getPatientsByProfileId(supabase, profile.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" asChild aria-label="Voltar">
              <Link href="/dashboard/medical-certificates">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <FileCheck className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Novo atestado
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha como preencher os dados, o tipo de atestado e gere o PDF para download.
          </p>
        </div>
      </div>

      <Separator />

      <MedicalCertificateWizard patients={patients} profile={profile} />
    </div>
  )
}

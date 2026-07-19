import { redirect } from "next/navigation"
import { FileText, Plus } from "lucide-react"
import { NewMedicalReportLink } from "./new/new-medical-report-link"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getMedicalReportsByProfileId } from "@/modules/medical-reports/get-medical-reports-by-profile-id"
import { MedicalReportTable } from "@/components/dashboard/medical-reports/medical-report-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function MedicalReportsPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const medicalReports = await getMedicalReportsByProfileId(supabase, profile.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Relatórios médicos
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os relatórios médicos gerados.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <NewMedicalReportLink>
            <Plus className="mr-2 h-4 w-4" />
            Novo relatório
          </NewMedicalReportLink>
        </Button>
      </div>

      <Separator />

      {medicalReports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">
              Nenhum relatório médico gerado.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere o primeiro relatório para um paciente.
            </p>
            <Button asChild className="mt-5">
              <NewMedicalReportLink>
                <Plus className="mr-2 h-4 w-4" />
                Novo relatório
              </NewMedicalReportLink>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <MedicalReportTable medicalReports={medicalReports} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

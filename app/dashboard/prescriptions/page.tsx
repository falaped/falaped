import { redirect } from "next/navigation"
import { Pill, Plus } from "lucide-react"
import { NewPrescriptionLink } from "./new/new-prescription-link"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPrescriptionsByProfileId } from "@/modules/prescriptions/get-prescriptions-by-profile-id"
import { PrescriptionTable } from "@/components/dashboard/prescriptions/prescription-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function PrescriptionsPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const prescriptions = await getPrescriptionsByProfileId(supabase, profile.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Pill className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Receitas
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere receitas de medicamentos para seus pacientes.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <NewPrescriptionLink>
            <Plus className="mr-2 h-4 w-4" />
            Criar receita
          </NewPrescriptionLink>
        </Button>
      </div>

      <Separator />

      {prescriptions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <Pill className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Nenhuma receita gerada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie uma receita para gerar o PDF e fazer o download.
            </p>
            <Button asChild className="mt-5">
              <NewPrescriptionLink>
                <Plus className="mr-2 h-4 w-4" />
                Criar receita
              </NewPrescriptionLink>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <PrescriptionTable prescriptions={prescriptions} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

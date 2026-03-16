import { redirect } from "next/navigation"
import { FileText, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPrescriptionTemplatesByProfileId } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import { PrescriptionTemplatesTableSection } from "@/components/dashboard/prescription-templates/prescription-templates-table-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { NewPrescriptionLink } from "@/app/dashboard/prescriptions/new/new-prescription-link"

export default async function PrescriptionTemplatesPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const templates = await getPrescriptionTemplatesByProfileId(
    supabase,
    profile.id,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Templates de receita
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Modelos de receita que você salvou. Use um ao criar nova receita ou
            salve a receita atual como template no wizard de receitas.
          </p>
        </div>
      </div>

      <Separator />

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Nenhum template de receita</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ao criar uma receita, use &quot;Salvar como template&quot; para
              guardar um modelo e reutilizá-lo depois.
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
        <PrescriptionTemplatesTableSection templates={templates} />
      )}
    </div>
  )
}

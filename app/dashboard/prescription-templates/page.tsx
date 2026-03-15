import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Separator } from "@/components/ui/separator"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPrescriptionTemplatesByProfileId } from "@/modules/prescription-templates/get-prescription-templates-by-profile-id"
import { PrescriptionTemplatesToolbarAndList } from "@/components/dashboard/prescription-templates/prescription-templates-toolbar-and-list"

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

      <PrescriptionTemplatesToolbarAndList templates={templates} />
    </div>
  )
}

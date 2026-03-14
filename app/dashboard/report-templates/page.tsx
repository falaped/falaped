import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, Plus, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getReportTemplatesByProfileId } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { ReportTemplatesToolbarAndList } from "@/components/dashboard/report-templates/report-templates-toolbar-and-list"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default async function ReportTemplatesPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const templates = await getReportTemplatesByProfileId(supabase, profile.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Templates de relatório
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Modelos de seções para os relatórios do atendimento. Escolha um no
            Perfil para usar por padrão.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/report-templates/gerar-com-ia">
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar com IA
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/report-templates/novo">
              <Plus className="mr-2 h-4 w-4" />
              Criar template
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      <ReportTemplatesToolbarAndList
        templates={templates}
        activeTemplateId={profile.report_template_id ?? null}
      />
    </div>
  )
}

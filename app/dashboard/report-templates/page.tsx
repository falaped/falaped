import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, Plus, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getReportTemplatesByProfileId } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { ReportTemplatesTableSection } from "@/components/dashboard/report-templates/report-templates-table-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function ReportTemplatesPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const templates = await getReportTemplatesByProfileId(supabase, profile.id)
  const userTemplates = templates.filter((t) => !t.is_default)
  const hasOnlyDefault = userTemplates.length === 0

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
            <Link href="/dashboard/report-templates/new">
              <Plus className="mr-2 h-4 w-4" />
              Criar template
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {hasOnlyDefault ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Nenhum template seu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um template para usar nos relatórios de atendimento.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard/report-templates/new">
                <Plus className="mr-2 h-4 w-4" />
                Criar template
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ReportTemplatesTableSection
          templates={templates}
          activeTemplateId={profile.report_template_id ?? null}
        />
      )}
    </div>
  )
}

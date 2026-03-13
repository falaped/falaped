import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { FileText, ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getReportTemplateByIdForProfile } from "@/modules/report-templates/get-report-template-by-id-for-profile"
import { ReportTemplateForm } from "@/components/dashboard/report-templates/report-template-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function EditReportTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const template = await getReportTemplateByIdForProfile(supabase, id, profile.id)
  if (!template) notFound()

  const initialSections = template.sections.map((s) => ({
    name: s.name ?? "",
    description: s.description ?? "",
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar">
          <Link href="/dashboard/report-templates">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar template
          </h1>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
          <CardDescription>
            Altere o nome e as seções. A ordem das seções será mantida na
            geração do relatório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportTemplateForm
            mode="edit"
            templateId={template.id}
            initialName={template.name}
            initialSections={initialSections.length > 0 ? initialSections : [{ name: "", description: "" }]}
          />
        </CardContent>
      </Card>
    </div>
  )
}

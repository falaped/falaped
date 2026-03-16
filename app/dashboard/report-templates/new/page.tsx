import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, ChevronLeft } from "lucide-react"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { createClient } from "@/lib/supabase/server"
import { ReportTemplateForm } from "@/components/dashboard/report-templates/report-template-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function NewReportTemplatePage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

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
            Novo template de relatório
          </h1>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Dados do template</CardTitle>
          <CardDescription>
            Nome e seções que comporão o relatório. A ordem das seções será
            mantida na geração do relatório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportTemplateForm mode="create" initialSections={[{ name: "", description: "" }]} />
        </CardContent>
      </Card>
    </div>
  )
}

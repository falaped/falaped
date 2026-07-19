import { redirect } from "next/navigation"
import Link from "next/link"
import { BookOpen, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getGuidanceTemplatesByProfileId } from "@/modules/guidance/get-guidance-templates-by-profile-id"
import { getGuidanceDocumentsByProfileId } from "@/modules/guidance/get-guidance-documents-by-profile-id"
import { GuidanceMilestoneManager } from "@/components/dashboard/guidance/guidance-milestone-manager"
import { GuidanceDocumentTable } from "@/components/dashboard/guidance/guidance-document-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function GuidancePage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const [templates, documents] = await Promise.all([
    getGuidanceTemplatesByProfileId(supabase, profile.id),
    getGuidanceDocumentsByProfileId(supabase, profile.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Orientações
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um marco e gere a orientação para o paciente.
          </p>
        </div>
        {templates.length > 0 ? (
          <Button asChild className="shrink-0">
            <Link href="/dashboard/guidance/new">
              <Plus className="mr-2 h-4 w-4" />
              Gerar orientação
            </Link>
          </Button>
        ) : null}
      </div>

      <Separator />

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <BookOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">
              Nenhuma orientação disponível.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Revise os textos de orientação por marco antes de usar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Biblioteca de marcos
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Edite os textos de cada marco, adicione marcos próprios ou
                remova os que não usa.
              </p>
            </div>
            <GuidanceMilestoneManager templates={templates} />
          </section>

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Orientações geradas
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Documentos de orientação gerados para os pacientes.
              </p>
            </div>
            {documents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm font-medium">
                    Nenhuma orientação gerada.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gere a primeira orientação para um paciente.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <GuidanceDocumentTable documents={documents} />
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

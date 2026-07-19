import { redirect } from "next/navigation"
import { FlaskConical, Plus } from "lucide-react"
import { NewExamRequestLink } from "./new/new-exam-request-link"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getExamRequestsByProfileId } from "@/modules/exam-requests/get-exam-requests-by-profile-id"
import { ExamRequestTable } from "@/components/dashboard/exam-requests/exam-request-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function ExamRequestsPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const examRequests = await getExamRequestsByProfileId(supabase, profile.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Pedidos de exames
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os pedidos de exames gerados.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <NewExamRequestLink>
            <Plus className="mr-2 h-4 w-4" />
            Novo pedido de exames
          </NewExamRequestLink>
        </Button>
      </div>

      <Separator />

      {examRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <FlaskConical className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">
              Nenhum pedido de exames gerado.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere o primeiro pedido de exames para um paciente.
            </p>
            <Button asChild className="mt-5">
              <NewExamRequestLink>
                <Plus className="mr-2 h-4 w-4" />
                Novo pedido de exames
              </NewExamRequestLink>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ExamRequestTable examRequests={examRequests} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

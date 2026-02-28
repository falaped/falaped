import { Suspense } from "react"
import { MessagesSquareIcon } from "lucide-react"

import { type CaseStatus } from "@/modules/cases/get-cases-by-user-phone"
import { CasesContent } from "@/components/dashboard/cases-content"
import { CasesLoading } from "@/components/dashboard/cases-loading"
import { Separator } from "@/components/ui/separator"

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const statusParam = params.status ?? "active"
  const statusFilter: CaseStatus =
    statusParam === "closed" || statusParam === "all" ? statusParam : "active"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <MessagesSquareIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Casos</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seus atendimentos por WhatsApp.
        </p>
      </div>

      <Separator />

      <Suspense fallback={<CasesLoading />}>
        <CasesContent statusFilter={statusFilter} />
      </Suspense>
    </div>
  )
}

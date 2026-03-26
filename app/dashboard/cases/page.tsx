import Link from "next/link"
import { Suspense } from "react"
import { MessagesSquareIcon, Plus } from "lucide-react"

import { CasesContent } from "@/components/dashboard/cases/cases-content"
import { CasesLoading } from "@/components/dashboard/cases/cases-loading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default async function CasesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <MessagesSquareIcon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Casos</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Casos ativos e encerrados pelo painel ou pelo WhatsApp.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/dashboard/cases/select-patient">
            <Plus className="mr-2 size-4" aria-hidden />
            Criar novo caso
          </Link>
        </Button>
      </div>

      <Separator />

      <Suspense fallback={<CasesLoading />}>
        <CasesContent />
      </Suspense>
    </div>
  )
}

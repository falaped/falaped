import { Suspense } from "react"
import { MessageCircleIcon } from "lucide-react"

import { DiscussionsContent } from "@/components/dashboard/discussions/discussions-content"
import { DiscussionsLoading } from "@/components/dashboard/discussions/discussions-loading"
import { Separator } from "@/components/ui/separator"

export default async function DiscussionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <MessageCircleIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Discussões</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversas livres com o Falaped, sem vínculo a paciente.
        </p>
      </div>

      <Separator />

      <Suspense fallback={<DiscussionsLoading />}>
        <DiscussionsContent />
      </Suspense>
    </div>
  )
}

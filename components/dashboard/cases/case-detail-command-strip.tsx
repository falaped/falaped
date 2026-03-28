import Link from "next/link"
import { MessageSquareIcon, PanelRightOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { CaseOrigin } from "@/modules/cases/types"

export type CaseDetailCommandStripProps = {
  caseId: string
  status: "active" | "closed"
  origin: CaseOrigin
}

/**
 * Primary next-step strip: cockpit CTA for active dashboard cases, archive copy when closed.
 */
export function CaseDetailCommandStrip({
  caseId,
  status,
  origin,
}: CaseDetailCommandStripProps) {
  const isActive = status === "active"
  const isDashboard = origin === "dashboard"

  if (!isActive) {
    return (
      <Card className="border-border/80 bg-muted/20">
        <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Caso encerrado — modo leitura
            </p>
            <p className="text-xs text-muted-foreground">
              Histórico da conversa e relatório permanecem disponíveis nas abas
              desta página.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isDashboard) {
    return (
      <Card
        className={cn(
          "border-primary/30 bg-primary/5",
        )}
      >
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <PanelRightOpen
                className="h-5 w-5 text-primary"
                aria-hidden
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Retomar o atendimento no painel
              </p>
              <p className="text-xs text-muted-foreground">
                A conversa com o assistente ocorre na área dedicada; aqui você
                acompanha o histórico e o relatório.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 gap-2">
            <Link href={`/dashboard/cases/new/${caseId}`}>
              <MessageSquareIcon className="h-4 w-4" aria-hidden />
              Ver Workspace
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/80">
      <CardContent className="py-4">
        <p className="text-sm font-medium text-foreground">
          Conversa pelo WhatsApp
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Este caso foi conduzido pelo canal WhatsApp. O histórico abaixo reflete
          as mensagens registradas no sistema.
        </p>
      </CardContent>
    </Card>
  )
}

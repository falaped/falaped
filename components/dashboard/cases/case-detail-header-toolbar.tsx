"use client"

import Link from "next/link"
import { MessageSquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CaseDetailActions } from "@/components/dashboard/cases/case-detail-actions"
import type { CaseOrigin } from "@/modules/cases/types"

type CaseDetailHeaderToolbarProps = {
  caseId: string
  status: "active" | "closed"
  origin: CaseOrigin
  /** Lançamentos não-anulados do caso; `null` = a leitura falhou (S7 bloqueia). */
  earningsCount: number | null
  earningsTotalCents: number | null
}

export function CaseDetailHeaderToolbar({
  caseId,
  status,
  origin,
  earningsCount,
  earningsTotalCents,
}: CaseDetailHeaderToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button variant="outline" asChild>
        <Link href="/dashboard/cases">Voltar</Link>
      </Button>
      {/* Só o atendimento em curso conduzido no painel tem workspace para retomar. */}
      {status === "active" && origin === "dashboard" ? (
        <Button asChild className="gap-2">
          <Link href={`/dashboard/cases/new/${caseId}`}>
            <MessageSquareIcon className="h-4 w-4" aria-hidden />
            Retomar atendimento
          </Link>
        </Button>
      ) : null}
      <CaseDetailActions
        caseId={caseId}
        earningsCount={earningsCount}
        earningsTotalCents={earningsTotalCents}
      />
    </div>
  )
}

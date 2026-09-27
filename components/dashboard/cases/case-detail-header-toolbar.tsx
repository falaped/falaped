"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CaseDetailActions } from "@/components/dashboard/cases/case-detail-actions"

type CaseDetailHeaderToolbarProps = {
  caseId: string
  /** Lançamentos não-anulados do caso; `null` = a leitura falhou (S7 bloqueia). */
  earningsCount: number | null
  earningsTotalCents: number | null
}

export function CaseDetailHeaderToolbar({
  caseId,
  earningsCount,
  earningsTotalCents,
}: CaseDetailHeaderToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button variant="outline" asChild>
        <Link href="/dashboard/cases">Voltar</Link>
      </Button>
      <CaseDetailActions
        caseId={caseId}
        earningsCount={earningsCount}
        earningsTotalCents={earningsTotalCents}
      />
    </div>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { MessageSquareIcon, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CaseDetailActions } from "@/components/dashboard/cases/case-detail-actions"
import { CloseCaseWithEarningsDialog } from "@/components/dashboard/cases/close-case-with-earnings-dialog"
import type { CaseOrigin } from "@/modules/cases/types"

type CaseDetailHeaderToolbarProps = {
  caseId: string
  status: "active" | "closed"
  origin: CaseOrigin
  /** Lançamentos não-anulados do caso; `null` = a leitura falhou (S7 bloqueia). */
  earningsCount: number | null
  earningsTotalCents: number | null
  /** Hoje no fuso da clínica, formatado no RSC — o cliente nunca deriva datas. */
  todayLabel: string
}

export function CaseDetailHeaderToolbar({
  caseId,
  status,
  origin,
  earningsCount,
  earningsTotalCents,
  todayLabel,
}: CaseDetailHeaderToolbarProps) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const [closeFlowOpen, setCloseFlowOpen] = useState(false)

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
      <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            aria-label="Ações do caso"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
            Ações
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <CaseDetailActions
            caseId={caseId}
            status={status}
            layout="menu"
            earningsCount={earningsCount}
            earningsTotalCents={earningsTotalCents}
            onRequestCloseCase={() => {
              setActionsOpen(false)
              setCloseFlowOpen(true)
            }}
          />
        </PopoverContent>
      </Popover>
      {/* IRMÃO do popover, nunca descendente: `PopoverContent` desmonta ao fechar e
          levaria os valores digitados na etapa 2 com ele. */}
      <CloseCaseWithEarningsDialog
        caseId={caseId}
        open={closeFlowOpen}
        onOpenChange={setCloseFlowOpen}
        todayLabel={todayLabel}
      />
    </div>
  )
}

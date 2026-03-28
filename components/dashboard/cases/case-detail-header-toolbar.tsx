"use client"

import Link from "next/link"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CaseDetailActions } from "@/components/dashboard/cases/case-detail-actions"

type CaseDetailHeaderToolbarProps = {
  caseId: string
  status: "active" | "closed"
}

export function CaseDetailHeaderToolbar({
  caseId,
  status,
}: CaseDetailHeaderToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button variant="outline" asChild>
        <Link href="/dashboard/cases">Voltar</Link>
      </Button>
      <Popover>
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
          <CaseDetailActions caseId={caseId} status={status} layout="menu" />
        </PopoverContent>
      </Popover>
    </div>
  )
}

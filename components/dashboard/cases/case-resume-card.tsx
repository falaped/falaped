import Link from "next/link"
import { MessageSquareIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** Primeiro card da grade: volta ao workspace do atendimento em curso. */
export function CaseResumeCard({ caseId }: { caseId: string }) {
  return (
    <Link href={`/dashboard/cases/new/${caseId}`} className="group h-full">
      <Card className="h-full bg-primary text-primary-foreground ring-primary transition-colors group-hover:bg-primary/90">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <MessageSquareIcon className="h-5 w-5" aria-hidden />
          <CardTitle className="text-base font-semibold">Retomar atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-primary-foreground/80">
            Volta ao workspace com o assistente e a transcrição da consulta.
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

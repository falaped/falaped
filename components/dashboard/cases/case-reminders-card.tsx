import { NotebookPenIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CaseRemindersForm } from "@/components/dashboard/cases/case-reminders-form"
import type { CaseReminder } from "@/modules/cases/types"

/** Lembretes do atendimento na página do caso. */
export function CaseRemindersCard({
  caseId,
  initialReminders,
}: {
  caseId: string
  initialReminders: CaseReminder[]
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <NotebookPenIcon className="h-4 w-4" aria-hidden />
          Lembretes e pendências
        </CardTitle>
        <CardDescription>
          O que precisa ser retomado na próxima consulta desta criança. Aparece
          na abertura do próximo atendimento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CaseRemindersForm caseId={caseId} initialReminders={initialReminders} />
      </CardContent>
    </Card>
  )
}

import { CaseRemindersForm } from "@/components/dashboard/cases/case-reminders-form"
import type { CaseReminder } from "@/modules/cases/types"

/** Lembretes da consulta: aparecem na abertura da próxima consulta desta criança. */
export function CaseRemindersCard({
  caseId,
  initialReminders,
}: {
  caseId: string
  initialReminders: CaseReminder[]
}) {
  return (
    <section className="rounded-xl bg-muted p-5">
      <h2 className="mb-3 font-display text-title font-semibold">Lembretes para a próxima consulta</h2>
      <CaseRemindersForm caseId={caseId} initialReminders={initialReminders} />
    </section>
  )
}

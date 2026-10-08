import { CaseRemindersForm } from "@/components/dashboard/cases/case-reminders-form"
import type { CaseReminder } from "@/modules/cases/types"

/** Lembretes da consulta: aparecem na abertura da próxima consulta desta criança. */
export function CaseRemindersCard({
  caseId,
  initialReminders,
  patientFirstName,
}: {
  caseId: string
  initialReminders: CaseReminder[]
  patientFirstName: string | null
}) {
  return (
    <section className="rounded-xl bg-muted p-5">
      <h2 className="font-display text-title font-semibold">Lembretes para a próxima consulta</h2>
      <p className="mb-3 text-caption text-subtle-foreground">
        Aparecem quando {patientFirstName ?? "a criança"} voltar.
      </p>
      <CaseRemindersForm caseId={caseId} initialReminders={initialReminders} collapsed />
    </section>
  )
}

import {
  FileCheckIcon,
  FlaskConicalIcon,
  ListChecksIcon,
  PaperclipIcon,
  PillIcon,
  RulerIcon,
  ScanTextIcon,
  SendIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { CaseRemindersDialog } from "@/components/dashboard/cases/case-reminders-dialog"
import { clinicTime, consultSections, type ConsultRecordKind, type ConsultRecordRow, type ConsultRecords } from "@/lib/consult-records"
import type { CaseReminder } from "@/modules/cases/types"

const KIND_ICON: Record<ConsultRecordKind, LucideIcon> = {
  prescription: PillIcon,
  certificate: FileCheckIcon,
  "exam-request": FlaskConicalIcon,
  referral: SendIcon,
  measurement: RulerIcon,
  scale: ListChecksIcon,
  "exam-reading": ScanTextIcon,
  attachment: PaperclipIcon,
}

function Section({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-1.5">
        <h3 className="text-caption font-medium text-subtle-foreground">{title}</h3>
        {count ? <span className="num text-caption text-subtle-foreground">{count}</span> : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      {children}
    </section>
  )
}

function RecordRow({ kind, label, sub, at }: Omit<ConsultRecordRow, "key">) {
  const Icon = KIND_ICON[kind]
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label font-medium">{label}</span>
        {sub ? <span className="num block truncate text-caption text-subtle-foreground">{sub}</span> : null}
      </span>
      <span className="num text-caption text-subtle-foreground">{clinicTime(at)}</span>
    </li>
  )
}

/** Conteúdo do painel "Nesta consulta": tudo o que a consulta já produziu, a alergia e os lembretes. */
export function ConsultRail({
  caseId,
  records,
  reminders,
  allergies,
  patientId,
}: {
  caseId: string
  records: ConsultRecords
  reminders: CaseReminder[]
  /** Alergias da ficha, uma por item; vazio quando não há. */
  allergies: string[]
  patientId: string | null
}) {
  const sections = consultSections(records)

  return (
    <div className="flex flex-col gap-5">
      {allergies.length ? (
        <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-label text-danger-text">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            {allergies.length === 1 ? "Alergia" : "Alergias"}: {allergies.join(", ")}
          </span>
          {patientId ? (
            <Link href={`/dashboard/patients/${patientId}/editar`} className="text-caption hover:underline">
              Editar
            </Link>
          ) : null}
        </div>
      ) : null}

      {sections.length ? (
        sections.map((section) => (
          <Section key={section.title} title={section.title} count={section.rows.length}>
            <ul className="flex flex-col gap-1.5">
              {section.rows.map(({ key, ...row }) => (
                <RecordRow key={key} {...row} />
              ))}
            </ul>
          </Section>
        ))
      ) : (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-label text-muted-foreground">
          Nada registrado ainda. Documentos, medidas, escalas, exames lidos e anexos aparecem aqui assim que você fizer.
        </p>
      )}

      <Section title="Lembretes" count={reminders.length}>
        {reminders.length ? (
          <ul className="mb-2 flex flex-col gap-1 text-label">
            {reminders.map((r) => (
              <li key={r.id} className="wrap-break-word">
                {r.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-label text-subtle-foreground">O que retomar na próxima consulta desta criança</p>
        )}
        <CaseRemindersDialog caseId={caseId} initialReminders={reminders} />
      </Section>

      <p className="border-t border-border pt-4 text-caption text-subtle-foreground">O relatório é gerado ao encerrar, com tudo o que está aqui.</p>
    </div>
  )
}

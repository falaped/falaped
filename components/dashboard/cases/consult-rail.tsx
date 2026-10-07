import {
  FileCheckIcon,
  FlaskConicalIcon,
  PillIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react"

import { CaseRemindersDialog } from "@/components/dashboard/cases/case-reminders-dialog"
import type { CaseReminder } from "@/modules/cases/types"
import type { ExamRequestListItem } from "@/modules/exam-requests/types"
import type { MedicalCertificateListItem } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { Measurement } from "@/modules/patient-growth/types"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"
import type { ReferralListItem } from "@/modules/referrals/types"

export type ConsultDocuments = {
  prescriptions: PrescriptionListItem[]
  certificates: MedicalCertificateListItem[]
  examRequests: ExamRequestListItem[]
  referrals: ReferralListItem[]
}

const CERTIFICATE_LABEL: Record<MedicalCertificateListItem["type"], string> = {
  comparecimento: "comparecimento",
  aptidao_fisica: "aptidão física",
  medico: "afastamento",
  acompanhante: "acompanhante",
}

const decimal = (value: number, digits: number) => value.toFixed(digits).replace(".", ",")

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-caption font-medium text-subtle-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function DocRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <Icon className="size-4 shrink-0 text-primary-ink" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-label">{label}</span>
      <span className="rounded-full bg-success-soft px-2 text-caption font-medium text-success-text">Emitido</span>
    </li>
  )
}

/** Coluna "Nesta consulta" (protótipo a5): o que a consulta já produziu, à vista o tempo todo. */
export function ConsultRail({
  caseId,
  documents,
  todayMeasurement,
  reminders,
}: {
  caseId: string
  documents: ConsultDocuments
  /** Medida registrada hoje, se houver. */
  todayMeasurement: Measurement | null
  reminders: CaseReminder[]
}) {
  const rows = [
    ...documents.prescriptions.map((p) => {
      const count = Array.isArray(p.payload.medications) ? p.payload.medications.length : 0
      return { key: p.id, icon: PillIcon, label: count ? `Receita · ${count} ${count === 1 ? "item" : "itens"}` : "Receita" }
    }),
    ...documents.certificates.map((c) => ({
      key: c.id,
      icon: FileCheckIcon,
      label: `Atestado de ${CERTIFICATE_LABEL[c.type] ?? "comparecimento"}`,
    })),
    ...documents.examRequests.map((e) => ({ key: e.id, icon: FlaskConicalIcon, label: "Pedido de exame" })),
    ...documents.referrals.map((r) => ({ key: r.id, icon: SendIcon, label: "Encaminhamento" })),
  ]

  const m = todayMeasurement
  const measures = m
    ? [
        m.weight_grams !== null ? `Peso ${decimal(m.weight_grams / 1000, 2)} kg` : null,
        m.length_height_mm !== null ? `Altura ${decimal(m.length_height_mm / 10, 1)} cm` : null,
        m.head_circumference_mm !== null ? `PC ${decimal(m.head_circumference_mm / 10, 1)} cm` : null,
      ].filter(Boolean)
    : []

  return (
    <aside className="flex flex-col gap-5 overflow-auto border-l border-border bg-muted px-4 py-5">
      <h2 className="font-display text-section font-semibold">Nesta consulta</h2>
      <Section title="Documentos">
        {rows.length ? (
          <ul className="flex flex-col gap-1.5">
            {rows.map(({ key, ...row }) => (
              <DocRow key={key} {...row} />
            ))}
          </ul>
        ) : (
          <p className="text-label text-subtle-foreground">Nenhum documento ainda</p>
        )}
      </Section>
      <Section title="Medidas">
        {measures.length ? (
          <p className="num text-label">
            {measures.join(" · ")} <span className="text-subtle-foreground">· hoje</span>
          </p>
        ) : (
          <p className="text-label text-subtle-foreground">Nenhuma medida hoje</p>
        )}
      </Section>
      <Section title="Lembretes" action={<CaseRemindersDialog caseId={caseId} initialReminders={reminders} />}>
        {reminders.length ? (
          <ul className="flex flex-col gap-1 text-label">
            {reminders.map((r) => (
              <li key={r.id} className="wrap-break-word">{r.text}</li>
            ))}
          </ul>
        ) : (
          <p className="text-label text-subtle-foreground">Para a próxima consulta desta criança</p>
        )}
      </Section>
      <Section title="Relatório">
        <p className="text-label text-subtle-foreground">Gerado ao encerrar, a partir da conversa</p>
      </Section>
    </aside>
  )
}

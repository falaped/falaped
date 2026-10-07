import {
  FileCheckIcon,
  FlaskConicalIcon,
  PillIcon,
  SendIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

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

/** Conteúdo do painel "Nesta consulta": o que a consulta já produziu e a alergia da criança. */
export function ConsultRail({
  caseId,
  documents,
  todayMeasurement,
  reminders,
  allergies,
  patientId,
}: {
  caseId: string
  documents: ConsultDocuments
  /** Medida registrada hoje, se houver. */
  todayMeasurement: Measurement | null
  reminders: CaseReminder[]
  /** Alergias da ficha, uma por item; vazio quando não há. */
  allergies: string[]
  patientId: string | null
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
    <div className="flex flex-col gap-5">
      {allergies.length ? (
        <Section
          title={allergies.length === 1 ? "Alergia" : "Alergias"}
          action={
            patientId ? (
              <Link href={`/dashboard/patients/${patientId}/editar`} className="text-caption text-muted-foreground hover:underline">
                Editar
              </Link>
            ) : null
          }
        >
          <ul className="flex flex-col gap-1 text-label">
            {allergies.map((allergy) => (
              <li key={allergy} className="flex items-center gap-2">
                <TriangleAlertIcon className="size-3.5 shrink-0 text-danger-text" aria-hidden />
                {allergy}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Section title="Lembretes">
        {reminders.length ? (
          <ul className="mb-2 flex flex-col gap-1 text-label">
            {reminders.map((r) => (
              <li key={r.id} className="wrap-break-word">{r.text}</li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-label text-subtle-foreground">O que retomar na próxima consulta desta criança</p>
        )}
        <CaseRemindersDialog caseId={caseId} initialReminders={reminders} />
      </Section>
      <Section title="Relatório">
        <p className="text-label text-subtle-foreground">Gerado ao encerrar, a partir da conversa</p>
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
    </div>
  )
}

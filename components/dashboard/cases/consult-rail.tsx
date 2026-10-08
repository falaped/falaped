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
import { formatTime } from "@/lib/formatters"
import { getScaleByKey } from "@/lib/scales"
import type { CaseReminder } from "@/modules/cases/types"
import type { ExamReading } from "@/modules/exam-readings/types"
import type { ExamRequestListItem } from "@/modules/exam-requests/types"
import type { MedicalCertificateListItem } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { PatientAttachment } from "@/modules/patient-attachments/types"
import type { Measurement } from "@/modules/patient-growth/types"
import type { ScaleResult } from "@/modules/patient-scales/types"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"
import type { ReferralListItem } from "@/modules/referrals/types"

export type ConsultDocuments = {
  prescriptions: PrescriptionListItem[]
  certificates: MedicalCertificateListItem[]
  examRequests: ExamRequestListItem[]
  referrals: ReferralListItem[]
}

/** O que a consulta produziu: documentos e registros ligados a ela (protótipo a5n). */
export type ConsultRecords = {
  documents: ConsultDocuments
  /** Medidas com a data da consulta: a medida é ligada à data, não ao caso. */
  measurements: Measurement[]
  scaleResults: ScaleResult[]
  examReadings: ExamReading[]
  attachments: PatientAttachment[]
}

const CERTIFICATE_LABEL: Record<MedicalCertificateListItem["type"], string> = {
  comparecimento: "comparecimento",
  aptidao_fisica: "aptidão física",
  medico: "afastamento",
  acompanhante: "acompanhante",
}

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

type Row = { key: string; icon: LucideIcon; label: string; sub?: string; at: string }

/** Nomes de uma lista no payload (remédios, exames), cortados em 3. */
function names(list: unknown, pick: (item: unknown) => unknown = (item) => item): string | undefined {
  if (!Array.isArray(list)) return undefined
  const all = list.map(pick).filter((v): v is string => typeof v === "string" && v.trim() !== "")
  if (!all.length) return undefined
  return all.length > 3 ? `${all.slice(0, 3).join(" · ")} +${all.length - 3}` : all.join(" · ")
}

function measurementRow(m: Measurement): Row {
  const main = [
    m.weight_grams != null ? `${decimal.format(m.weight_grams / 1000)} kg` : null,
    m.length_height_mm != null ? `${decimal.format(m.length_height_mm / 10)} cm` : null,
    m.head_circumference_mm != null ? `PC ${decimal.format(m.head_circumference_mm / 10)} cm` : null,
  ].filter(Boolean)
  const bp = m.systolic_bp != null && m.diastolic_bp != null ? `PA ${m.systolic_bp}/${m.diastolic_bp}` : undefined
  return { key: m.id, icon: RulerIcon, label: main.length ? main.join(" · ") : (bp ?? "Medida"), sub: main.length ? bp : undefined, at: m.created_at }
}

/** As seções do painel, na ordem em que aparecem; só entram as que têm algo. */
export function consultSections(records: ConsultRecords): { title: string; rows: Row[] }[] {
  const { documents } = records
  const byTime = (rows: Row[]) => rows.sort((a, b) => a.at.localeCompare(b.at))
  return [
    {
      title: "Documentos",
      rows: byTime([
        ...documents.prescriptions.map((p) => ({
          key: p.id,
          icon: PillIcon,
          label: "Receita",
          sub: names(p.payload.medications, (m) => (m as { name?: unknown })?.name),
          at: p.created_at,
        })),
        ...documents.certificates.map((c) => ({
          key: c.id,
          icon: FileCheckIcon,
          label: `Atestado de ${CERTIFICATE_LABEL[c.type] ?? "comparecimento"}`,
          at: c.created_at,
        })),
        ...documents.examRequests.map((e) => ({ key: e.id, icon: FlaskConicalIcon, label: "Pedido de exame", sub: names(e.payload.exams), at: e.created_at })),
        ...documents.referrals.map((r) => ({
          key: r.id,
          icon: SendIcon,
          label: "Encaminhamento",
          sub: typeof r.payload.specialty === "string" ? r.payload.specialty : undefined,
          at: r.created_at,
        })),
      ]),
    },
    { title: "Medidas", rows: byTime(records.measurements.map(measurementRow)) },
    {
      title: "Escalas",
      rows: byTime(
        records.scaleResults.map((r) => ({
          key: r.id,
          icon: ListChecksIcon,
          label: getScaleByKey(r.scale_key)?.name ?? r.scale_key,
          sub: [r.score != null ? `${r.score} ${r.score === 1 ? "ponto" : "pontos"}` : null, r.interpretation].filter(Boolean).join(" · ") || undefined,
          at: r.created_at,
        })),
      ),
    },
    {
      title: "Exames lidos",
      rows: byTime(
        records.examReadings.map((r) => {
          const altered = r.items.filter((item) => item.flag === "low" || item.flag === "high").length
          return {
            key: r.id,
            icon: ScanTextIcon,
            label: r.title,
            sub: altered ? `${altered} ${altered === 1 ? "valor alterado" : "valores alterados"}` : "Sem alterações",
            at: r.created_at,
          }
        }),
      ),
    },
    {
      title: "Anexos",
      rows: byTime(records.attachments.map((a) => ({ key: a.id, icon: PaperclipIcon, label: a.title?.trim() || a.file_name, at: a.created_at }))),
    },
  ].filter((section) => section.rows.length > 0)
}

/** Quantos registros a consulta já tem: o número do botão "Nesta consulta". */
export function countConsultRecords(records: ConsultRecords): number {
  return consultSections(records).reduce((total, section) => total + section.rows.length, 0)
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

function RecordRow({ icon: Icon, label, sub, at }: Omit<Row, "key">) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label font-medium">{label}</span>
        {sub ? <span className="num block truncate text-caption text-subtle-foreground">{sub}</span> : null}
      </span>
      <span className="num text-caption text-subtle-foreground">{formatTime(at)}</span>
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

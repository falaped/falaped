import { tz } from "@date-fns/tz"
import { format } from "date-fns"

import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { computePediatricBmi } from "@/lib/parse-anthropometrics-for-bmi"
import { getScaleByKey } from "@/lib/scales"
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

export type ConsultRecordKind =
  | "prescription"
  | "certificate"
  | "exam-request"
  | "referral"
  | "measurement"
  | "scale"
  | "exam-reading"
  | "attachment"

export type ConsultRecordRow = { key: string; kind: ConsultRecordKind; label: string; sub?: string; at: string }

const CERTIFICATE_LABEL: Record<MedicalCertificateListItem["type"], string> = {
  comparecimento: "comparecimento",
  aptidao_fisica: "aptidão física",
  medico: "afastamento",
  acompanhante: "acompanhante",
}

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

/** Dia (yyyy-MM-dd) de um instante no fuso da clínica: o servidor roda em UTC. */
export function clinicDay(value: string | Date): string {
  return format(value, "yyyy-MM-dd", { in: tz(CLINIC_TIME_ZONE) })
}

/** Hora (HH:mm) no fuso da clínica. */
export function clinicTime(value: string | Date): string {
  return format(value, "HH:mm", { in: tz(CLINIC_TIME_ZONE) })
}

/** Nomes de uma lista no payload (remédios, exames), cortados em 3. */
function names(list: unknown, pick: (item: unknown) => unknown = (item) => item): string | undefined {
  if (!Array.isArray(list)) return undefined
  const all = list.map(pick).filter((v): v is string => typeof v === "string" && v.trim() !== "")
  if (!all.length) return undefined
  return all.length > 3 ? `${all.slice(0, 3).join(" · ")} +${all.length - 3}` : all.join(" · ")
}

function measurementRow(m: Measurement): ConsultRecordRow {
  const main = [
    m.weight_grams != null ? `${decimal.format(m.weight_grams / 1000)} kg` : null,
    m.length_height_mm != null ? `${decimal.format(m.length_height_mm / 10)} cm` : null,
    m.head_circumference_mm != null ? `PC ${decimal.format(m.head_circumference_mm / 10)} cm` : null,
  ].filter(Boolean)
  const bp = m.systolic_bp != null && m.diastolic_bp != null ? `PA ${m.systolic_bp}/${m.diastolic_bp}` : undefined
  // IMC da própria medida (peso e estatura da mesma linha), como na ficha.
  const bmi =
    m.weight_grams != null && m.length_height_mm != null
      ? computePediatricBmi(m.weight_grams / 1000, m.length_height_mm / 1000)
      : null
  const bmiText = bmi?.ok ? `IMC ${decimal.format(bmi.bmi)}` : bmi ? "IMC fora da faixa esperada" : null
  const sub = [bmiText, main.length ? bp : null].filter(Boolean).join(" · ") || undefined
  return {
    key: m.id,
    kind: "measurement",
    label: main.length ? main.join(" · ") : (bp ?? "Medida"),
    sub,
    // A medida alterada pelo chat conta a partir da alteração.
    at: m.updated_at ?? m.created_at,
  }
}

/** As seções do painel, na ordem em que aparecem; só entram as que têm algo. */
export function consultSections(records: ConsultRecords): { title: string; rows: ConsultRecordRow[] }[] {
  const { documents } = records
  const byTime = (rows: ConsultRecordRow[]) => rows.sort((a, b) => a.at.localeCompare(b.at))
  return [
    {
      title: "Documentos",
      rows: byTime([
        ...documents.prescriptions.map((p): ConsultRecordRow => ({
          key: p.id,
          kind: "prescription",
          label: "Receita",
          sub: names(p.payload.medications, (m) => (m as { name?: unknown })?.name),
          at: p.created_at,
        })),
        ...documents.certificates.map((c): ConsultRecordRow => ({
          key: c.id,
          kind: "certificate",
          label: `Atestado de ${CERTIFICATE_LABEL[c.type] ?? "comparecimento"}`,
          at: c.created_at,
        })),
        ...documents.examRequests.map((e): ConsultRecordRow => ({
          key: e.id,
          kind: "exam-request",
          label: "Pedido de exame",
          sub: names(e.payload.exams),
          at: e.created_at,
        })),
        ...documents.referrals.map((r): ConsultRecordRow => ({
          key: r.id,
          kind: "referral",
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
          kind: "scale",
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
            kind: "exam-reading",
            label: r.title,
            sub: altered ? `${altered} ${altered === 1 ? "valor alterado" : "valores alterados"}` : "Sem alterações",
            at: r.created_at,
          }
        }),
      ),
    },
    {
      title: "Anexos",
      rows: byTime(
        records.attachments.map((a) => ({ key: a.id, kind: "attachment", label: a.title?.trim() || a.file_name, at: a.created_at })),
      ),
    },
  ].filter((section) => section.rows.length > 0)
}

/** Quantos registros a consulta já tem: o número do botão "Nesta consulta". */
export function countConsultRecords(records: ConsultRecords): number {
  return consultSections(records).reduce((total, section) => total + section.rows.length, 0)
}

/**
 * O que a consulta produziu, em texto para a IA: cada item com a hora e o resumo de uma linha.
 * Null quando não há nada, para o prompt não carregar um bloco vazio.
 */
export function formatConsultRecordsForAi(records: ConsultRecords): string | null {
  const sections = consultSections(records)
  if (!sections.length) return null
  return sections
    .map(
      (section) =>
        `${section.title}:\n${section.rows
          .map((row) => `• ${clinicTime(row.at)} ${row.label}${row.sub ? ` (${row.sub})` : ""}`)
          .join("\n")}`,
    )
    .join("\n")
}

/**
 * Peso (kg), altura e PC (cm) mais recentes do histórico de medidas, no formato texto do
 * cadastro antigo (`patient.weight`/`height`/`head_circumference`). Null no campo sem medida,
 * para quem chama cair no valor do cadastro.
 */
export function latestAnthropometry(measurements: Measurement[]): {
  weight: string | null
  height: string | null
  head_circumference: string | null
} {
  const latest = (pick: (m: Measurement) => number | null, divisor: number) => {
    const value = measurements.findLast((m) => pick(m) != null)
    return value ? decimal.format(pick(value)! / divisor) : null
  }
  return {
    weight: latest((m) => m.weight_grams, 1000),
    height: latest((m) => m.length_height_mm, 10),
    head_circumference: latest((m) => m.head_circumference_mm, 10),
  }
}

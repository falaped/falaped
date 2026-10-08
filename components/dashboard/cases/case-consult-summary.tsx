import Link from "next/link"
import {
  ChevronRightIcon,
  ClipboardCheckIcon,
  FlaskConicalIcon,
  PaperclipIcon,
  ScaleIcon,
  type LucideIcon,
} from "lucide-react"

import { getScaleByKey } from "@/lib/scales"
import type { ExamReading } from "@/modules/exam-readings/types"
import type { PatientAttachment } from "@/modules/patient-attachments/types"
import type { ScaleResult } from "@/modules/patient-scales/types"
import type { Measurement } from "@/modules/patient-growth/types"

type Row = { key: string; icon: LucideIcon; kind: string; text: string; href: string }

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

function measurementText(m: Measurement): string {
  return [
    m.weight_grams != null ? `${decimal.format(m.weight_grams / 1000)} kg` : null,
    m.length_height_mm != null ? `${decimal.format(m.length_height_mm / 10)} cm` : null,
    m.head_circumference_mm != null ? `PC ${decimal.format(m.head_circumference_mm / 10)} cm` : null,
    m.systolic_bp != null && m.diastolic_bp != null ? `PA ${m.systolic_bp}/${m.diastolic_bp}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

/**
 * "Nesta consulta" (protótipo b2): uma linha curta por coisa feita no atendimento —
 * medidas do dia, escalas, exames lidos e anexos. Só o que existe; cada linha abre a
 * aba certa da ficha, onde mora o detalhe. Sem nada feito, o card não aparece.
 */
export function CaseConsultSummary({
  patientId,
  measurements,
  scaleResults,
  examReadings,
  attachments,
}: {
  patientId: string
  /** Medidas com a data da consulta (a medida é ligada à data, não ao caso). */
  measurements: Measurement[]
  scaleResults: ScaleResult[]
  examReadings: ExamReading[]
  attachments: PatientAttachment[]
}) {
  const ficha = `/dashboard/patients/${patientId}`
  const rows: Row[] = [
    ...measurements.map((m) => ({
      key: `m-${m.id}`,
      icon: ScaleIcon,
      kind: "Medidas",
      text: measurementText(m),
      href: `${ficha}#crescimento`,
    })),
    ...scaleResults.map((r) => ({
      key: `s-${r.id}`,
      icon: ClipboardCheckIcon,
      kind: "Escala",
      text: [getScaleByKey(r.scale_key)?.name ?? r.scale_key, r.interpretation].filter(Boolean).join(" · "),
      href: `${ficha}#escalas`,
    })),
    ...examReadings.map((r) => {
      const altered = r.items.filter((item) => item.flag === "low" || item.flag === "high").length
      return {
        key: `e-${r.id}`,
        icon: FlaskConicalIcon,
        kind: "Exame lido",
        text: `${r.title} · ${altered ? `${altered} ${altered === 1 ? "valor alterado" : "valores alterados"}` : "sem alterações"}`,
        href: `${ficha}#exames`,
      }
    }),
    ...attachments.map((a) => ({
      key: `a-${a.id}`,
      icon: PaperclipIcon,
      kind: "Anexo",
      text: a.title?.trim() || a.file_name,
      href: `${ficha}#anexos`,
    })),
  ].filter((row) => row.text)

  if (rows.length === 0) return null

  return (
    <section className="rounded-xl border border-border bg-card">
      <h2 className="px-5 pt-4 pb-2 font-display text-title font-semibold">Nesta consulta</h2>
      <ul className="divide-y divide-border border-t border-border">
        {rows.map(({ key, icon: Icon, kind, text, href }) => (
          <li key={key}>
            <Link href={href} className="flex items-center gap-3 px-5 py-2.5 hover:bg-accent">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-caption text-subtle-foreground">{kind}</span>
                <span className="block truncate font-medium num">{text}</span>
              </span>
              <ChevronRightIcon className="size-4 text-subtle-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

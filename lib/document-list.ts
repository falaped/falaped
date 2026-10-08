import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { tz } from "@date-fns/tz"

import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import type { DocumentRow } from "@/modules/documents/list-documents-by-profile"

const zone = { in: tz(CLINIC_TIME_ZONE) }
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")
const andMore = (items: string[]) =>
  items.length > 1 ? `${items[0]} e mais ${items.length - 1}` : (items[0] ?? "")

const CERTIFICATE_LABEL: Record<string, string> = {
  comparecimento: "Comparecimento",
  aptidao_fisica: "Aptidão física",
  medico: "Afastamento",
  acompanhante: "Acompanhante",
}

const URGENCY_LABEL: Record<string, string> = { rotina: "Rotina", prioritario: "Prioritário", urgente: "Urgente" }

/** Segunda linha da linha do documento: o que foi emitido, em poucas palavras. */
export function documentDetail(row: Pick<DocumentRow, "kind" | "payload" | "certificateType">): string {
  const p = row.payload
  if (row.kind === "prescription") {
    const meds = Array.isArray(p.medications) ? p.medications.map((m) => text((m as { name?: unknown }).name)).filter(Boolean) : []
    return meds.length ? andMore(meds) : "Receituário em branco"
  }
  if (row.kind === "exam-request") {
    return andMore(Array.isArray(p.exams) ? p.exams.map(text).filter(Boolean) : [])
  }
  if (row.kind === "referral") {
    return [text(p.specialty), URGENCY_LABEL[text(p.urgency)]].filter(Boolean).join(" · ")
  }
  const type = row.certificateType ?? ""
  const extra =
    type === "medico" && Number(p.daysAway) > 0
      ? `${Number(p.daysAway)} ${Number(p.daysAway) === 1 ? "dia" : "dias"}`
      : (type === "comparecimento" || type === "acompanhante") && text(p.timeStart) && text(p.timeEnd)
        ? `${text(p.timeStart)} às ${text(p.timeEnd)}`
        : ""
  return [CERTIFICATE_LABEL[type] ?? "Atestado", extra].filter(Boolean).join(" · ")
}

export type DocumentGroup = "Hoje" | "Esta semana" | "Antes"

/** Hoje, últimos 7 dias ou antes, no fuso da clínica. */
export function documentGroup(createdAt: string, now: Date): DocumentGroup {
  const days = differenceInCalendarDays(now, new Date(createdAt), zone)
  return days <= 0 ? "Hoje" : days < 7 ? "Esta semana" : "Antes"
}

/** Hora para hoje, "Seg, 06/10" na semana, "29/09" antes (com o ano se for outro). */
export function documentWhen(createdAt: string, now: Date): string {
  const date = new Date(createdAt)
  const group = documentGroup(createdAt, now)
  if (group === "Hoje") return format(date, "HH:mm", zone)
  if (group === "Esta semana") {
    const weekday = format(date, "EEEE", { ...zone, locale: ptBR })
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1, 3)}, ${format(date, "dd/MM", zone)}`
  }
  return format(date, format(date, "yyyy", zone) === format(now, "yyyy", zone) ? "dd/MM" : "dd/MM/yy", zone)
}

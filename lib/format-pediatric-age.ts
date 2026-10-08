import { intervalToDuration } from "date-fns"
import type { PediatricAge, PediatricAgeParts } from "@/lib/compute-pediatric-age"

/**
 * PT-BR by-extenso rendering of a {@link PediatricAge} result, with singular/plural
 * agreement (D-08). This function NEVER does date math — it only renders the engine
 * result. Non-"ok" status (missing/invalid/future) returns an empty string; the
 * consuming component renders the UI-SPEC copy for those states.
 */
export function formatPediatricAge(age: PediatricAge): string {
  if (age.status !== "ok" || !age.band || !age.parts) return ""
  const p = age.parts

  switch (age.band) {
    case "days":
      return pluralize(p.days ?? 0, "dia", "dias")
    case "weeks":
      return pluralize(p.weeks ?? 0, "semana", "semanas")
    case "months_days":
      return joinClausesPtBr([
        pluralize(p.months ?? 0, "mês", "meses"),
        (p.days ?? 0) > 0 ? pluralize(p.days ?? 0, "dia", "dias") : null,
      ])
    case "years_months":
      return joinClausesPtBr([
        pluralize(p.years ?? 0, "ano", "anos"),
        (p.months ?? 0) > 0 ? pluralize(p.months ?? 0, "mês", "meses") : null,
        (p.days ?? 0) > 0 ? pluralize(p.days ?? 0, "dia", "dias") : null,
      ])
  }
}

/**
 * Abbreviated rendering for tight surfaces (e.g. the case header): "5 d", "6 sem",
 * "3m 12d", "2a 1m 13d". Renders only; non-"ok" status returns an empty string.
 */
export function formatPediatricAgeAbbrev(age: PediatricAge): string {
  if (age.status !== "ok" || !age.band || !age.parts) return ""
  const p: PediatricAgeParts = age.parts

  switch (age.band) {
    case "days":
      return `${p.days ?? 0} d`
    case "weeks":
      return `${p.weeks ?? 0} sem`
    case "months_days":
      return (p.days ?? 0) > 0 ? `${p.months ?? 0}m ${p.days ?? 0}d` : `${p.months ?? 0}m`
    case "years_months": {
      const segs = [`${p.years ?? 0}a`]
      if ((p.months ?? 0) > 0) segs.push(`${p.months}m`)
      if ((p.days ?? 0) > 0) segs.push(`${p.days}d`)
      return segs.join(" ")
    }
  }
}

/** "N singular" when N === 1, otherwise "N plural". */
function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/**
 * Join PT-BR clauses dropping nulls: 1 → "A", 2 → "A e B", 3 → "A, B e C".
 * Used by both the months+days and years+months+days bands.
 */
function joinClausesPtBr(clauses: Array<string | null>): string {
  const parts = clauses.filter((c): c is string => !!c)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`
}

/**
 * Even shorter rendering for lists (Início, busca): like `formatPediatricAgeAbbrev`
 * but drops the days once there are months or years ("2a 3m", "8m", "6 sem", "5 d").
 */
export function formatPediatricAgeShort(age: PediatricAge): string {
  return formatPediatricAgeAbbrev(age).replace(/^(\d+[am](?: \d+m)?) \d+d$/, "$1")
}

const unit = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Idade completa do cabeçalho da Consulta: "4 anos, 6 meses, 2 semanas e 3 dias", sem as
 * partes zeradas. Ao contrário das funções acima, faz a conta a partir do nascimento
 * ("yyyy-MM-dd"); vazio sem data válida ou no futuro.
 */
export function formatPediatricAgeFull(birthDate: string | null, now: Date): string {
  const birth = birthDate ? new Date(`${birthDate.slice(0, 10)}T00:00:00`) : null
  if (!birth || Number.isNaN(birth.getTime()) || birth > now) return ""
  const { years = 0, months = 0, days = 0 } = intervalToDuration({ start: birth, end: now })
  const parts = [
    years ? unit(years, "ano", "anos") : null,
    months ? unit(months, "mês", "meses") : null,
    days >= 7 ? unit(Math.floor(days / 7), "semana", "semanas") : null,
    days % 7 ? unit(days % 7, "dia", "dias") : null,
  ].filter((part): part is string => part !== null)
  if (parts.length === 0) return "Nasceu hoje"
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}`
}

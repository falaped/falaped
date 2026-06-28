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
      return joinAnd(
        pluralize(p.months ?? 0, "mês", "meses"),
        (p.days ?? 0) > 0 ? pluralize(p.days ?? 0, "dia", "dias") : null,
      )
    case "years_months":
      return joinAnd(
        pluralize(p.years ?? 0, "ano", "anos"),
        (p.months ?? 0) > 0 ? pluralize(p.months ?? 0, "mês", "meses") : null,
      )
  }
}

/**
 * Abbreviated rendering for tight surfaces (e.g. the case header): "5 d", "6 sem",
 * "3m 12d", "2a 4m". Renders only; non-"ok" status returns an empty string.
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
    case "years_months":
      return (p.months ?? 0) > 0 ? `${p.years ?? 0}a ${p.months ?? 0}m` : `${p.years ?? 0}a`
  }
}

/** "N singular" when N === 1, otherwise "N plural". */
function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Join two clauses with " e ", dropping the second when null. */
function joinAnd(primary: string, secondary: string | null): string {
  return secondary ? `${primary} e ${secondary}` : primary
}

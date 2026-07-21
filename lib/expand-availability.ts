import { tz, TZDate } from "@date-fns/tz"
import { addDays, addMinutes, eachDayOfInterval, format, startOfDay } from "date-fns"

/**
 * Uma faixa recorrente da grade semanal (AGENDA-01/02, D-02/D-09).
 *
 * `weekday` segue a convenção 0=domingo..6=sábado — a mesma de `date-fns`
 * `getDay()` e a mesma coluna `weekday` da tabela `availability_rules` do Plano 01.
 * `startMinute`/`endMinute` são minutos-desde-meia-noite (wall-clock puro, sem fuso;
 * a expansão os ancora num dia concreto no named zone). Faixa meio-aberta
 * `[startMinute, endMinute)`. `slotMinutes` é a duração POR FAIXA (D-09).
 */
export type AvailabilityBand = {
  weekday: number
  startMinute: number
  endMinute: number
  slotMinutes: number
}

/**
 * Exceção subtrativa para uma data do calendário da clínica (AGENDA-03, D-04).
 * `date` é `"YYYY-MM-DD"` no fuso da clínica. `startMinute`/`endMinute` ambos
 * `null` = dia inteiro removido; ambos preenchidos = remove a faixa meio-aberta
 * `[startMinute, endMinute)` que sobrepõe slots (D-04).
 */
export type AvailabilityException = {
  date: string
  startMinute: number | null
  endMinute: number | null
}

/** Um slot livre expandido: instantes UTC meio-abertos `[start, end)`. */
export type FreeSlot = {
  /** Instante (UTC) do início do slot. */
  start: Date
  /** Instante (UTC) do fim (exclusivo). */
  end: Date
  /** `"YYYY-MM-DD"` no fuso da clínica (para agrupar por dia). */
  localDate: string
}

export type ExpandResult = {
  slots: FreeSlot[]
  /** Resumo leve por dia local para a view de mês (D-07): não renderiza horários. */
  byDay: Record<string, { freeSlotCount: number; hasAvailability: boolean }>
}

/**
 * Expande regras (grade semanal) + exceções (subtrativas) em slots livres, dentro
 * de uma janela meio-aberta `[from, to)`, no fuso informado. Pura e determinística
 * (D-12): não lê `new Date()` nem `process.env.TZ` — recebe `window` e `timeZone`
 * por parâmetro, exatamente como `computePediatricAge(birth, now)`.
 *
 * Toda aritmética de calendário roda no named zone via `{ in: tz(timeZone) }`, de
 * modo que o TZ do host (Vercel = UTC) nunca vaza. Intervalos são SEMPRE meio-abertos
 * `[start, end)` — comparação com `< end`, nunca `<=`, para não duplicar/sumir o slot
 * da virada (D-11). A sobra de faixa que não divide certo é descartada (D-10).
 *
 * @param input.rules Faixas recorrentes por `weekday` (0=domingo..6=sábado).
 * @param input.exceptions Exceções subtrativas por data local da clínica.
 * @param input.window Janela meio-aberta `[from, to)` (instantes) — a janela da view.
 * @param input.timeZone Named zone da clínica (ex. `"America/Sao_Paulo"`); nunca do host.
 */
export function expandAvailability(input: {
  rules: AvailabilityBand[]
  exceptions: AvailabilityException[]
  window: { from: Date; to: Date }
  timeZone: string
}): ExpandResult {
  const { rules, exceptions, window, timeZone } = input
  const { from, to } = window

  const slots: FreeSlot[] = []
  const byDay: ExpandResult["byDay"] = {}

  // Janela vazia ou invertida → nada a fazer (sem throw).
  if (from >= to) {
    return { slots, byDay }
  }

  const context = { in: tz(timeZone) }

  // Índice de exceções por data local ("YYYY-MM-DD").
  const exceptionsByDate = new Map<string, AvailabilityException[]>()
  for (const ex of exceptions) {
    const list = exceptionsByDate.get(ex.date)
    if (list) list.push(ex)
    else exceptionsByDate.set(ex.date, [ex])
  }

  // `eachDayOfInterval` é inclusivo nas duas pontas; a janela é meio-aberta, então
  // iteramos até `to` e recortamos os slots por `slot.start < to` no fim.
  const days = eachDayOfInterval({ start: from, end: to }, context)

  for (const day of days) {
    const localDate = format(day, "yyyy-MM-dd", context)
    const dayStart = startOfDay(day, context)
    const weekday = new TZDate(day, timeZone).getDay() // 0=domingo..6=sábado

    // Exceção de dia inteiro (startMinute === null) → remove o dia todo (D-04).
    const dayExceptions = exceptionsByDate.get(localDate) ?? []
    const fullDayBlocked = dayExceptions.some((ex) => ex.startMinute === null)

    if (fullDayBlocked) {
      // Garante que o dia apareça em byDay como sem disponibilidade se estava na janela.
      if (day >= from && day < to && byDay[localDate] === undefined) {
        byDay[localDate] = { freeSlotCount: 0, hasAvailability: false }
      }
      continue
    }

    const partialExceptions = dayExceptions.filter(
      (ex): ex is { date: string; startMinute: number; endMinute: number } =>
        ex.startMinute !== null && ex.endMinute !== null,
    )

    for (const band of rules) {
      if (band.weekday !== weekday) continue

      const bandEnd = addMinutes(dayStart, band.endMinute, context)
      let slotStart = addMinutes(dayStart, band.startMinute, context)

      // D-10: só emite slot inteiro (slotStart + slotMinutes <= bandEnd); descarta a sobra.
      while (addMinutes(slotStart, band.slotMinutes, context) <= bandEnd) {
        const slotEnd = addMinutes(slotStart, band.slotMinutes, context)

        // D-04: remove slots que sobrepõem uma exceção parcial [exStart, exEnd).
        const overlapsException = partialExceptions.some((ex) => {
          const exStart = addMinutes(dayStart, ex.startMinute, context)
          const exEnd = addMinutes(dayStart, ex.endMinute, context)
          return slotStart < exEnd && slotEnd > exStart
        })

        // Recorte ao window meio-aberto [from, to): compara com < to, nunca <= (D-11).
        const withinWindow = slotStart >= from && slotStart < to

        if (!overlapsException && withinWindow) {
          slots.push({
            start: new Date(slotStart.getTime()),
            end: new Date(slotEnd.getTime()),
            localDate,
          })
          const bucket = (byDay[localDate] ??= {
            freeSlotCount: 0,
            hasAvailability: false,
          })
          bucket.freeSlotCount += 1
          bucket.hasAvailability = true
        }

        slotStart = slotEnd
      }
    }
  }

  return { slots, byDay }
}

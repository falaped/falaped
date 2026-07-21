import { tz, TZDate } from "@date-fns/tz"
import {
  eachDayOfInterval,
  format,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from "date-fns"

/**
 * Uma faixa recorrente do template semanal (AGENDA-01/02, D-02/D-09/D-19).
 *
 * `weekday` segue a convenção 0=domingo..6=sábado — a mesma de `date-fns`
 * `getDay()` e a mesma coluna `weekday` da tabela `availability_rules`.
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
 * Override por data do calendário da clínica (D-20, modelo híbrido v2).
 *
 * `date` é `"YYYY-MM-DD"` no fuso da clínica. `type` distingue:
 * - `"subtract"` (folga, AGENDA-03/D-04): remove disponibilidade. `startMinute`/
 *   `endMinute` ambos `null` = dia inteiro removido; ambos preenchidos = remove a
 *   faixa meio-aberta `[startMinute, endMinute)` que sobrepõe slots. `slotMinutes`
 *   é ignorado.
 * - `"add"` (disponibilidade extra pontual, AGENDA-05/D-20): abre horário fora do
 *   template recorrente daquele dia. Exige `startMinute`/`endMinute`/`slotMinutes`
 *   (aditivo dia-inteiro não faz sentido — garantido pelo schema/DB).
 */
export type AvailabilityOverride = {
  date: string
  type: "add" | "subtract"
  startMinute: number | null
  endMinute: number | null
  slotMinutes: number | null
}

/**
 * Alias de compatibilidade v1. A v1 modelava apenas exceções subtrativas; os
 * call-sites remanescentes que ainda o usam mapeiam para overrides `"subtract"`.
 * Novo código deve usar `AvailabilityOverride` com `type`. Remover no Plano 02/03.
 *
 * @deprecated Use `AvailabilityOverride`.
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
 * Deriva o instante UTC do WALL-CLOCK `minuteOfDay` (minutos desde 00:00) sobre o
 * `day` já ancorado no named zone. DST-safe (corrige WR-01): em vez de somar
 * minutos ABSOLUTOS a `startOfDay` (`addMinutes`, que num spring-forward drena 1h),
 * derivamos hora/minuto do minute-of-day e fazemos `setHours/Minutes/Seconds/Ms`
 * no context do zone, deixando o `Intl` re-resolver o offset daquele wall-clock.
 *
 * Aceita `minuteOfDay` até 1440 (24:00 = início do dia seguinte no wall-clock),
 * coerente com o teto WR-03/WR-04.
 */
function wallClock(day: Date, minuteOfDay: number, timeZone: string): Date {
  const context = { in: tz(timeZone) }
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = minuteOfDay % 60
  let d = setHours(day, hours, context)
  d = setMinutes(d, minutes, context)
  d = setSeconds(d, 0, context)
  d = setMilliseconds(d, 0, context)
  return new Date(d.getTime())
}

/** Overrides já particionados por tipo, para um único dia local. */
type DayOverrides = {
  /** Aditivos com faixa+duração (garantidos não-null pelo schema/DB). */
  add: { startMinute: number; endMinute: number; slotMinutes: number }[]
  /** true se há folga de dia inteiro (startMinute === null). */
  fullDayBlocked: boolean
  /** Folgas parciais `[startMinute, endMinute)`. */
  subtractPartial: { startMinute: number; endMinute: number }[]
}

/**
 * Expande o template recorrente (grade semanal) + overrides por data (aditivos e
 * subtrativos) em slots livres, dentro de uma janela meio-aberta `[from, to)`, no
 * fuso informado. Pura e determinística (D-12): não lê `new Date()` nem
 * `process.env.TZ` — recebe `window` e `timeZone` por parâmetro, exatamente como
 * `computePediatricAge(birth, now)`.
 *
 * Precedência HÍBRIDA (D-21 — folga vence): para cada dia da janela,
 *   1. coleta os slots do template recorrente do weekday;
 *   2. UNE os slots dos overrides ADITIVOS daquela data (dedupe por `start.getTime()`,
 *      cada aditivo com seu próprio `slotMinutes`);
 *   3. por último SUBTRAI os overrides SUBTRATIVOS daquela data. Folga de dia inteiro
 *      (`startMinute === null`) remove template E aditivos; folga parcial remove os
 *      slots que sobrepõem a faixa meio-aberta.
 *
 * Toda aritmética de calendário roda no named zone via `{ in: tz(timeZone) }`, e os
 * limites de slot são construídos WALL-CLOCK (helper `wallClock`, DST-safe, WR-01):
 * o TZ do host (Vercel = UTC) nunca vaza e o offset é re-resolvido pelo `Intl` em
 * cada limite. Intervalos são SEMPRE meio-abertos `[start, end)` — comparação com
 * `< end`, nunca `<=`, para não duplicar/sumir o slot da virada (D-11). A sobra de
 * faixa que não divide certo é descartada (D-10).
 *
 * @param input.rules Faixas recorrentes do template por `weekday` (0=domingo..6=sábado).
 * @param input.overrides Overrides por data local da clínica (aditivos/subtrativos, D-20).
 * @param input.window Janela meio-aberta `[from, to)` (instantes) — a janela da view.
 * @param input.timeZone Named zone da clínica (ex. `"America/Sao_Paulo"`); nunca do host.
 */
export function expandAvailability(input: {
  rules: AvailabilityBand[]
  overrides: AvailabilityOverride[]
  window: { from: Date; to: Date }
  timeZone: string
}): ExpandResult {
  const { rules, overrides, window, timeZone } = input
  const { from, to } = window

  const slots: FreeSlot[] = []
  const byDay: ExpandResult["byDay"] = {}

  // Janela vazia ou invertida → nada a fazer (sem throw).
  if (from >= to) {
    return { slots, byDay }
  }

  const context = { in: tz(timeZone) }

  // Índice de overrides por data local ("YYYY-MM-DD"), já particionado por tipo.
  const overridesByDate = new Map<string, DayOverrides>()
  for (const ov of overrides) {
    let bucket = overridesByDate.get(ov.date)
    if (!bucket) {
      bucket = { add: [], fullDayBlocked: false, subtractPartial: [] }
      overridesByDate.set(ov.date, bucket)
    }
    if (ov.type === "add") {
      // Schema/DB garantem faixa + slot não-null para aditivos; guarda defensiva.
      if (
        ov.startMinute !== null &&
        ov.endMinute !== null &&
        ov.slotMinutes !== null
      ) {
        bucket.add.push({
          startMinute: ov.startMinute,
          endMinute: ov.endMinute,
          slotMinutes: ov.slotMinutes,
        })
      }
      continue
    }
    // type === "subtract"
    if (ov.startMinute === null) {
      bucket.fullDayBlocked = true
    } else if (ov.endMinute !== null) {
      bucket.subtractPartial.push({
        startMinute: ov.startMinute,
        endMinute: ov.endMinute,
      })
    }
  }

  // `eachDayOfInterval` é inclusivo nas duas pontas; a janela é meio-aberta, então
  // iteramos até `to` e recortamos os slots por `slot.start < to` no fim.
  const days = eachDayOfInterval({ start: from, end: to }, context)

  for (const day of days) {
    const localDate = format(day, "yyyy-MM-dd", context)
    const weekday = new TZDate(day, timeZone).getDay() // 0=domingo..6=sábado

    const dayOverrides = overridesByDate.get(localDate)

    // Folga de dia inteiro (D-21): remove template E aditivos daquela data.
    if (dayOverrides?.fullDayBlocked) {
      if (day >= from && day < to && byDay[localDate] === undefined) {
        byDay[localDate] = { freeSlotCount: 0, hasAvailability: false }
      }
      continue
    }

    const subtractPartial = dayOverrides?.subtractPartial ?? []

    // Fontes de slots do dia: template recorrente (weekday) + aditivos da data.
    // Cada fonte carrega sua própria duração de slot (D-09/AGENDA-05).
    const sources: { startMinute: number; endMinute: number; slotMinutes: number }[] =
      []
    for (const band of rules) {
      if (band.weekday !== weekday) continue
      sources.push({
        startMinute: band.startMinute,
        endMinute: band.endMinute,
        slotMinutes: band.slotMinutes,
      })
    }
    if (dayOverrides) {
      for (const add of dayOverrides.add) sources.push(add)
    }

    // Dedupe por `start.getTime()` (Pitfall 3): aditivo que sobrepõe o template não
    // duplica slots. Guarda os candidatos numa Map antes de recortar/subtrair.
    const candidates = new Map<number, FreeSlot>()

    for (const source of sources) {
      // D-10: só emite slot inteiro; itera em minute-of-day e constrói cada limite
      // WALL-CLOCK (DST-safe, WR-01) — nunca `addMinutes` sobre o instante anterior.
      for (
        let minute = source.startMinute;
        minute + source.slotMinutes <= source.endMinute;
        minute += source.slotMinutes
      ) {
        const slotStart = wallClock(day, minute, timeZone)
        const slotEnd = wallClock(day, minute + source.slotMinutes, timeZone)

        // Folga parcial (D-04/D-21): remove slots que sobrepõem [exStart, exEnd).
        const overlapsSubtract = subtractPartial.some((ex) => {
          const exStart = wallClock(day, ex.startMinute, timeZone)
          const exEnd = wallClock(day, ex.endMinute, timeZone)
          return slotStart < exEnd && slotEnd > exStart
        })
        if (overlapsSubtract) continue

        // Recorte ao window meio-aberto [from, to): compara com < to, nunca <= (D-11).
        if (!(slotStart >= from && slotStart < to)) continue

        candidates.set(slotStart.getTime(), { start: slotStart, end: slotEnd, localDate })
      }
    }

    if (candidates.size === 0) continue

    // Emite ordenado por instante de início (determinístico, independe da ordem
    // das fontes template/aditivo).
    const daySlots = [...candidates.values()].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    )
    for (const slot of daySlots) {
      slots.push(slot)
      const bucket = (byDay[localDate] ??= {
        freeSlotCount: 0,
        hasAvailability: false,
      })
      bucket.freeSlotCount += 1
      bucket.hasAvailability = true
    }
  }

  return { slots, byDay }
}

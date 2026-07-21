import test from "node:test"
import assert from "node:assert/strict"

import { TZDate } from "@date-fns/tz"

import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { expandAvailability } from "@/lib/expand-availability"
import type { AvailabilityBand, AvailabilityException } from "@/lib/expand-availability"

// All tests pass an explicit `window {from,to}` and `timeZone`, constructed via
// TZDate (never `new Date("YYYY-MM-DD")`, which parses UTC midnight → off-by-one
// in BRT). The function receives the time zone by parameter and never reads the
// host TZ, so these assertions hold identically under TZ=UTC and TZ=America/New_York.

const TZ = CLINIC_TIME_ZONE

// Local-wall-clock instant in the clinic zone.
function spInstant(
  y: number,
  m: number,
  d: number,
  hh = 0,
  mm = 0,
): Date {
  return new Date(TZDate.tz(TZ, y, m - 1, d, hh, mm, 0, 0).getTime())
}

// Weekday convention: 0=domingo..6=sábado (date-fns getDay()).
// 2026-07-20 is a Monday (weekday 1); 2026-07-22 is a Wednesday (weekday 3).
const MONDAY = 1
const WEDNESDAY = 3

// Single-day window helper: [00:00 of day, 00:00 of next day) in the clinic zone.
function singleDay(y: number, m: number, d: number) {
  return { from: spInstant(y, m, d, 0, 0), to: spInstant(y, m, d + 1, 0, 0) }
}

// Minutes-of-day of a slot start in the clinic zone (for readable assertions).
function localMinuteOfDay(instant: Date): number {
  const z = new TZDate(instant, TZ)
  return z.getHours() * 60 + z.getMinutes()
}

test("D-02 múltiplas faixas/dia: manhã + tarde → dois blocos, gap do almoço vazio", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 8 * 60, endMinute: 12 * 60, slotMinutes: 30 },
    { weekday: MONDAY, startMinute: 14 * 60, endMinute: 18 * 60, slotMinutes: 30 },
  ]
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: singleDay(2026, 7, 20),
    timeZone: TZ,
  })
  const minutes = result.slots.map((s) => localMinuteOfDay(s.start))
  // Manhã 08:00–12:00 @30 = 8 slots; tarde 14:00–18:00 @30 = 8 slots.
  assert.equal(result.slots.length, 16)
  // Gap do almoço (12:00–14:00) vazio.
  assert.ok(minutes.every((m) => m < 12 * 60 || m >= 14 * 60))
  assert.ok(minutes.includes(11 * 60 + 30)) // último da manhã
  assert.ok(minutes.includes(14 * 60)) // primeiro da tarde
})

test("D-09 duração por faixa: manhã @30min e tarde @20min → contagens diferentes", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 8 * 60, endMinute: 12 * 60, slotMinutes: 30 },
    { weekday: MONDAY, startMinute: 14 * 60, endMinute: 18 * 60, slotMinutes: 20 },
  ]
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: singleDay(2026, 7, 20),
    timeZone: TZ,
  })
  const morning = result.slots.filter((s) => localMinuteOfDay(s.start) < 12 * 60)
  const afternoon = result.slots.filter((s) => localMinuteOfDay(s.start) >= 14 * 60)
  assert.equal(morning.length, 8) // 4h / 30min
  assert.equal(afternoon.length, 12) // 4h / 20min
})

test("D-10 sobra descartada: 14:00–18:00 @45min → 5 slots (ignora 15 min finais)", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 14 * 60, endMinute: 18 * 60, slotMinutes: 45 },
  ]
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: singleDay(2026, 7, 20),
    timeZone: TZ,
  })
  const minutes = result.slots.map((s) => localMinuteOfDay(s.start))
  assert.deepEqual(minutes, [
    14 * 60,
    14 * 60 + 45,
    15 * 60 + 30,
    16 * 60 + 15,
    17 * 60,
  ])
  // 17:00 + 45 = 17:45 < 18:00 ok; 17:45 + 45 = 18:30 > 18:00 descartado.
  assert.equal(result.slots.length, 5)
})

test("D-10 divisão exata: 08:00–12:00 @30min → 8 slots, sem sobra", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 8 * 60, endMinute: 12 * 60, slotMinutes: 30 },
  ]
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: singleDay(2026, 7, 20),
    timeZone: TZ,
  })
  assert.equal(result.slots.length, 8)
  assert.equal(localMinuteOfDay(result.slots[0].start), 8 * 60)
  assert.equal(localMinuteOfDay(result.slots[7].start), 11 * 60 + 30)
})

test("D-04 exceção dia inteiro: 0 slots na data, dias vizinhos intactos", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 8 * 60, endMinute: 12 * 60, slotMinutes: 30 },
  ]
  const exceptions: AvailabilityException[] = [
    { date: "2026-07-20", startMinute: null, endMinute: null },
  ]
  const result = expandAvailability({
    rules,
    exceptions,
    // Janela de duas segundas: 2026-07-20 (bloqueada) e 2026-07-27 (intacta).
    window: { from: spInstant(2026, 7, 20, 0, 0), to: spInstant(2026, 7, 28, 0, 0) },
    timeZone: TZ,
  })
  assert.equal(result.byDay["2026-07-20"]?.freeSlotCount ?? 0, 0)
  assert.equal(result.byDay["2026-07-20"]?.hasAvailability ?? false, false)
  assert.equal(result.byDay["2026-07-27"]?.freeSlotCount, 8)
  assert.equal(result.byDay["2026-07-27"]?.hasAvailability, true)
})

test("D-04 exceção parcial: 'saio 16:00' numa quarta 14:00–18:00 → só até 15:30", () => {
  const rules: AvailabilityBand[] = [
    { weekday: WEDNESDAY, startMinute: 14 * 60, endMinute: 18 * 60, slotMinutes: 30 },
  ]
  const exceptions: AvailabilityException[] = [
    // Remove faixa a partir das 16:00 até o fim do dia.
    { date: "2026-07-22", startMinute: 16 * 60, endMinute: 24 * 60 },
  ]
  const result = expandAvailability({
    rules,
    exceptions,
    window: singleDay(2026, 7, 22),
    timeZone: TZ,
  })
  const minutes = result.slots.map((s) => localMinuteOfDay(s.start))
  assert.deepEqual(minutes, [14 * 60, 14 * 60 + 30, 15 * 60, 15 * 60 + 30])
})

test("D-04 exceção parcial que não sobrepõe: nenhum slot removido", () => {
  const rules: AvailabilityBand[] = [
    { weekday: WEDNESDAY, startMinute: 14 * 60, endMinute: 18 * 60, slotMinutes: 30 },
  ]
  const exceptions: AvailabilityException[] = [
    // Exceção 08:00–10:00, fora da faixa da tarde → não remove nada.
    { date: "2026-07-22", startMinute: 8 * 60, endMinute: 10 * 60 },
  ]
  const result = expandAvailability({
    rules,
    exceptions,
    window: singleDay(2026, 7, 22),
    timeZone: TZ,
  })
  assert.equal(result.slots.length, 8) // faixa 14–18 @30 intacta
})

test("D-11 virada de semana: slot de domingo 23:30 pertence à semana corrente, sem duplicação", () => {
  // Semana começa na segunda 2026-07-20 00:00 → próxima segunda 2026-07-27 00:00.
  // Domingo 2026-07-26 tem faixa 23:00–24:00 @30 → slots 23:00 e 23:30.
  const SUNDAY = 0
  const rules: AvailabilityBand[] = [
    { weekday: SUNDAY, startMinute: 23 * 60, endMinute: 24 * 60, slotMinutes: 30 },
  ]
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: { from: spInstant(2026, 7, 20, 0, 0), to: spInstant(2026, 7, 27, 0, 0) },
    timeZone: TZ,
  })
  const sundaySlots = result.slots.filter((s) => s.localDate === "2026-07-26")
  assert.equal(sundaySlots.length, 2)
  assert.deepEqual(
    sundaySlots.map((s) => localMinuteOfDay(s.start)),
    [23 * 60, 23 * 60 + 30],
  )
  // Nenhum slot cai na próxima segunda (fora da janela meio-aberta).
  assert.ok(result.slots.every((s) => s.start < spInstant(2026, 7, 27, 0, 0)))
})

test("D-11 virada de dia meio-aberta: slot que termina em 00:00 pertence ao dia que termina", () => {
  const SUNDAY = 0
  const rules: AvailabilityBand[] = [
    { weekday: SUNDAY, startMinute: 23 * 60 + 30, endMinute: 24 * 60, slotMinutes: 30 },
  ]
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: singleDay(2026, 7, 26), // domingo
    timeZone: TZ,
  })
  assert.equal(result.slots.length, 1)
  // O slot 23:30–00:00 pertence ao domingo 2026-07-26, não à segunda seguinte.
  assert.equal(result.slots[0].localDate, "2026-07-26")
  assert.equal(localMinuteOfDay(result.slots[0].start), 23 * 60 + 30)
})

test("D-11 fuso fixo: resultado independe do TZ do processo (instantes e localDate)", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 8 * 60, endMinute: 12 * 60, slotMinutes: 30 },
  ]
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: singleDay(2026, 7, 20),
    timeZone: TZ,
  })
  // O primeiro slot é 2026-07-20 08:00 em SP. Em julho, SP = UTC-3 (sem DST).
  // Como instante UTC, isso é 2026-07-20T11:00:00Z — valor absoluto que independe
  // do TZ do processo de teste.
  assert.equal(result.slots[0].start.toISOString(), "2026-07-20T11:00:00.000Z")
  assert.equal(result.slots[0].end.toISOString(), "2026-07-20T11:30:00.000Z")
  assert.equal(result.slots[0].localDate, "2026-07-20")
  assert.equal(result.slots.length, 8)
})

test("janela vazia: 0 slots, sem throw", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 8 * 60, endMinute: 12 * 60, slotMinutes: 30 },
  ]
  const from = spInstant(2026, 7, 20, 0, 0)
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: { from, to: from }, // janela vazia [from, from)
    timeZone: TZ,
  })
  assert.equal(result.slots.length, 0)
})

test("weekday sem faixa: 0 slots, sem throw", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 8 * 60, endMinute: 12 * 60, slotMinutes: 30 },
  ]
  // Janela numa terça (weekday 2), sem regra → 0 slots.
  const result = expandAvailability({
    rules,
    exceptions: [],
    window: singleDay(2026, 7, 21),
    timeZone: TZ,
  })
  assert.equal(result.slots.length, 0)
})

test("D-07 mês: byDay conta freeSlotCount e marca hasAvailability por dia", () => {
  const rules: AvailabilityBand[] = [
    { weekday: MONDAY, startMinute: 8 * 60, endMinute: 12 * 60, slotMinutes: 30 },
  ]
  const result = expandAvailability({
    rules,
    exceptions: [],
    // Segunda 2026-07-20 + terça 2026-07-21.
    window: { from: spInstant(2026, 7, 20, 0, 0), to: spInstant(2026, 7, 22, 0, 0) },
    timeZone: TZ,
  })
  assert.equal(result.byDay["2026-07-20"].freeSlotCount, 8)
  assert.equal(result.byDay["2026-07-20"].hasAvailability, true)
  assert.equal(result.byDay["2026-07-21"]?.freeSlotCount ?? 0, 0)
  assert.equal(result.byDay["2026-07-21"]?.hasAvailability ?? false, false)
})

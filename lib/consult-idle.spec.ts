import test from "node:test"
import assert from "node:assert/strict"

import { closeTiming, consultClock, summarizeIdle } from "@/lib/consult-idle"

const at = (hhmm: string) => `2026-10-08T${hhmm}:00.000Z`
const t = (hhmm: string) => Date.parse(at(hhmm))
const MIN = 60_000

test("consulta viva: sem pausa e sem idle", () => {
  assert.deepEqual(summarizeIdle(at("09:10"), [at("09:25"), at("09:42")], t("10:00")), { gapsMs: 0, idleSince: null })
})

test("2h30 sem atividade: idle desde a última atividade", () => {
  assert.deepEqual(summarizeIdle(at("09:10"), [at("09:42")], t("12:13")), { gapsMs: 0, idleSince: at("09:42") })
})

test("sem nenhuma atividade: idle desde o início", () => {
  assert.equal(summarizeIdle(at("09:10"), [], t("12:00")).idleSince, at("09:10"))
})

test("voltou depois do intervalo: o intervalo vira pausa e o cronômetro segue", () => {
  const s = summarizeIdle(at("09:10"), [at("09:42"), at("14:00")], t("14:10"))
  assert.deepEqual(s, { gapsMs: t("14:00") - t("09:42"), idleSince: null })
})

test("atividade antes do início (consulta reaberta) não conta", () => {
  assert.equal(summarizeIdle(at("09:10"), [at("08:00")], t("09:20")).gapsMs, 0)
})

test("encerrar esquecida: termina na última atividade", () => {
  const r = closeTiming({ startedAt: at("09:10"), pausedMs: 0, pausedAt: null }, [at("09:42")], t("19:00"))
  assert.deepEqual(r, { endedAt: at("09:42"), pausedMs: 0 })
})

test("encerrar depois de voltar: desconta o intervalo", () => {
  const r = closeTiming({ startedAt: at("09:10"), pausedMs: 0, pausedAt: null }, [at("09:42"), at("14:00")], t("14:10"))
  assert.equal(Date.parse(r.endedAt) - t("09:10") - r.pausedMs, 42 * MIN)
})

test("horário informado pela médica manda", () => {
  const r = closeTiming({ startedAt: at("09:10"), pausedMs: 0, pausedAt: null }, [], t("19:00"), at("09:30"))
  assert.deepEqual(r, { endedAt: at("09:30"), pausedMs: 0 })
})

test("pausa manual aberta: termina onde pausou", () => {
  const r = closeTiming({ startedAt: at("09:10"), pausedMs: 0, pausedAt: at("09:40") }, [at("09:30")], t("10:00"))
  assert.deepEqual(r, { endedAt: at("09:40"), pausedMs: 0 })
})

test("relógio da tela: parada congela na última atividade", () => {
  const timer = { startedAt: at("09:10"), pausedMs: 0, pausedAt: null }
  assert.deepEqual(consultClock(timer, [at("09:42")], t("19:00")), { elapsedMs: 32 * MIN, idleSince: at("09:42") })
  assert.deepEqual(consultClock(timer, [at("09:42")], t("10:00")), { elapsedMs: 50 * MIN, idleSince: null })
})

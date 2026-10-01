import assert from "node:assert/strict"
import { test } from "node:test"

import { activityState, attentionReasons, paymentState } from "./account-health"

const now = new Date("2026-10-01T12:00:00Z")
const row = (status: string | null, trial_ends_at: string | null = null, paid_until: string | null = null) => ({
  status,
  trial_ends_at,
  paid_until,
})

test("pagamento: pago com e sem vencimento", () => {
  assert.deepEqual(paymentState(row("paid"), now), { state: "em-dia", daysLeft: null })
  assert.deepEqual(paymentState(row("paid", null, "2026-11-01"), now), { state: "em-dia", daysLeft: 32 })
  assert.deepEqual(paymentState(row("paid", null, "2026-10-05"), now), { state: "vencendo", daysLeft: 5 })
  // vence no fim do dia de hoje em Brasília: ainda não venceu
  assert.equal(paymentState(row("paid", null, "2026-10-01"), now).state, "vencendo")
  assert.deepEqual(paymentState(row("paid", null, "2026-09-29"), now), { state: "vencido", daysLeft: -1 })
})

test("pagamento: trial, trial acabou, bloqueado, sem acesso", () => {
  assert.deepEqual(paymentState(row("unpaid", "2026-10-04T12:00:00Z"), now), { state: "trial", daysLeft: 3 })
  assert.equal(paymentState(row("unpaid", "2026-09-30T12:00:00Z"), now).state, "trial-acabou")
  assert.equal(paymentState(row("blocked", "2026-10-04T12:00:00Z"), now).state, "bloqueado")
  assert.equal(paymentState(row("unpaid"), now).state, "sem-acesso")
})

test("atividade pelos limites de 7 e 21 dias", () => {
  assert.equal(activityState(null, now), "nunca-usou")
  assert.equal(activityState("2026-09-25T12:00:00Z", now), "ativo")
  assert.equal(activityState("2026-09-20T12:00:00Z", now), "esfriando")
  assert.equal(activityState("2026-09-01T12:00:00Z", now), "parado")
})

test("atenção: pagou e não usou, teste acabando, ativo em dia fica fora", () => {
  const base = { status: "paid", trial_ends_at: null, paid_until: null, last_activity_at: null }
  assert.deepEqual(attentionReasons(base, now), ["Pagou e nunca registrou nada"])
  assert.deepEqual(attentionReasons({ ...base, last_activity_at: "2026-09-30T12:00:00Z" }, now), [])
  assert.deepEqual(
    attentionReasons({ ...base, status: "unpaid", trial_ends_at: "2026-10-03T12:00:00Z", last_activity_at: "2026-09-30T12:00:00Z" }, now),
    ["Teste acaba em 2 dias"],
  )
  assert.deepEqual(
    attentionReasons({ ...base, status: "unpaid", trial_ends_at: "2026-09-28T12:00:00Z" }, now),
    ["Teste acabou há 3 dias sem pagamento"],
  )
  assert.deepEqual(attentionReasons({ ...base, status: "blocked" }, now), [])
})

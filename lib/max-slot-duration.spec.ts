import assert from "node:assert/strict"
import { test } from "node:test"

import { maxSlotDuration } from "./max-slot-duration"

const STEP = 30
const CAP = 90

/** Helper: livre em todos os minutos, exceto os listados como ocupados. */
function freeExcept(busy: number[]) {
  return (minute: number) => !busy.includes(minute)
}

test("caso real: 15:00 livre com 15:30 confirmada → só 30 min cabem", () => {
  // 900 = 15:00, 930 = 15:30 (consulta confirmed 15:30–16:00).
  assert.equal(maxSlotDuration(900, STEP, CAP, freeExcept([930])), 30)
})

test("slot totalmente livre para no cap", () => {
  assert.equal(maxSlotDuration(900, STEP, CAP, () => true), CAP)
})

test("primeira célula ocupada → nenhuma duração cabe", () => {
  assert.equal(maxSlotDuration(900, STEP, CAP, freeExcept([900])), 0)
})

test("buraco de disponibilidade interrompe o encadeamento", () => {
  // 900 e 930 livres, 960 é folga → 60 min.
  assert.equal(maxSlotDuration(900, STEP, CAP, freeExcept([960])), 60)
})

test("status final (cancelada) não bloqueia — quem decide é o isFree", () => {
  // A cancelada das 15:00 não entra em `busy`: a exclusion constraint do banco
  // filtra WHERE status IN ('pending','confirmed'), então ela libera o slot.
  assert.equal(maxSlotDuration(900, STEP, CAP, freeExcept([])), CAP)
})

test("nunca passa do cap mesmo com cap não múltiplo do step", () => {
  const total = maxSlotDuration(900, STEP, 45, () => true)
  assert.ok(total <= 45, `esperado <= 45, veio ${total}`)
})

test("step inválido falha alto em vez de girar para sempre", () => {
  assert.throws(() => maxSlotDuration(900, 0, CAP, () => true), /step/)
})

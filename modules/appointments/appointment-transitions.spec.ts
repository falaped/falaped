import test from "node:test"
import assert from "node:assert/strict"

import {
  APPOINTMENT_TRANSITIONS,
  isLegalTransition,
} from "@/modules/appointments/appointment-transitions"
import type { AppointmentStatus } from "@/modules/appointments/types"

test("legal transitions from pending (confirmar | recusar)", () => {
  assert.equal(isLegalTransition("pending", "confirmed"), true)
  assert.equal(isLegalTransition("pending", "canceled"), true)
})

test("legal transitions from confirmed (realizada | falta | cancelar)", () => {
  assert.equal(isLegalTransition("confirmed", "done"), true)
  assert.equal(isLegalTransition("confirmed", "no_show"), true)
  assert.equal(isLegalTransition("confirmed", "canceled"), true)
})

test("illegal transitions are rejected", () => {
  assert.equal(isLegalTransition("canceled", "confirmed"), false)
  assert.equal(isLegalTransition("done", "confirmed"), false)
  assert.equal(isLegalTransition("confirmed", "pending"), false)
})

test("final states have no outgoing transition", () => {
  const finalStates: AppointmentStatus[] = ["done", "no_show", "canceled"]
  for (const state of finalStates) {
    assert.deepEqual(
      APPOINTMENT_TRANSITIONS[state],
      [],
      `${state} deve ser um estado final (lista vazia)`,
    )
  }
})

test("no transition is legal out of a final state", () => {
  const allStates: AppointmentStatus[] = [
    "pending",
    "confirmed",
    "done",
    "no_show",
    "canceled",
  ]
  const finalStates: AppointmentStatus[] = ["done", "no_show", "canceled"]
  for (const from of finalStates) {
    for (const to of allStates) {
      assert.equal(
        isLegalTransition(from, to),
        false,
        `${from} -> ${to} não deveria ser legal (estado final)`,
      )
    }
  }
})

import test from "node:test"
import assert from "node:assert/strict"

import { matchPatientQuery } from "@/lib/match-patient-query"

const helena = { name: "Helena Duarte", responsible: "Carla Duarte", contactPhone: "(31) 98888-1111" }

test("bate por palavras do nome ou do responsável, sem acento", () => {
  assert.equal(matchPatientQuery(helena, "hel duar"), true)
  assert.equal(matchPatientQuery(helena, "CARLA"), true)
  assert.equal(matchPatientQuery({ ...helena, name: "Lívia Souza" }, "livia"), true)
})

test("bate pelo telefone só com dígitos", () => {
  assert.equal(matchPatientQuery(helena, "988881111"), true)
})

test("não bate quando uma palavra não aparece", () => {
  assert.equal(matchPatientQuery(helena, "Bruna Carvalho"), false)
  assert.equal(matchPatientQuery(helena, "helena 7777"), false)
})

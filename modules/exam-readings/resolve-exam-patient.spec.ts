import assert from "node:assert/strict"
import { test } from "node:test"

import { resolveExamPatient } from "./resolve-exam-patient"

const casePatient = { name: "Teste", birth_date: "2025-07-07", sex: "feminino" as const }
const base = { laboratory: null, collected_at: null, exam_types: [], patient_name: null, patient_birth_date: null, patient_age: null, patient_sex: null }

test("laudo com nascimento e coleta: idade na data da coleta, nome e sexo do laudo", () => {
  const r = resolveExamPatient(
    { ...base, patient_name: "Alice", patient_birth_date: "27/04/2024", collected_at: "31/08/2026", patient_sex: "masculino" },
    casePatient,
    new Date("2026-09-26T12:00:00"),
  )
  assert.equal(r.name, "Alice")
  assert.equal(r.birthDateLabel, "27/04/2024")
  assert.equal(r.ageLabel, "2 anos, 4 meses e 4 dias (28 meses)")
  assert.equal(r.sexLabel, "Masculino")
  assert.equal(r.source, "exam")
})

test("laudo só com idade por extenso usa o texto; sem nada, cai no cadastro do caso", () => {
  const a = resolveExamPatient({ ...base, patient_age: "3 meses" }, casePatient, new Date("2026-09-26T12:00:00"))
  assert.equal(a.ageLabel, "3 meses")
  assert.equal(a.source, "exam")
  const b = resolveExamPatient(base, casePatient, new Date("2026-09-26T12:00:00"))
  assert.equal(b.name, "Teste")
  assert.equal(b.birthDateLabel, "07/07/2025")
  assert.equal(b.ageLabel, "14 meses e 19 dias (14 meses)")
  assert.equal(b.sexLabel, "Feminino")
  assert.equal(b.source, "case")
})

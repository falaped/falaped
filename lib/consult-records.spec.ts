import assert from "node:assert/strict"
import { test } from "node:test"

import { clinicDay, countConsultRecords, formatConsultRecordsForAi, latestAnthropometry, type ConsultRecords } from "./consult-records"

const empty: ConsultRecords = {
  documents: { prescriptions: [], certificates: [], examRequests: [], referrals: [] },
  measurements: [],
  scaleResults: [],
  examReadings: [],
  attachments: [],
}

test("sem registros: nada para a IA e contador zerado", () => {
  assert.equal(formatConsultRecordsForAi(empty), null)
  assert.equal(countConsultRecords(empty), 0)
})

test("a IA recebe cada documento com a hora da clínica, mesmo sem o conteúdo", () => {
  const records = {
    ...empty,
    documents: {
      ...empty.documents,
      prescriptions: [{ id: "p1", created_at: "2026-10-08T13:05:00Z", payload: { medications: [{ name: "Amoxicilina" }] } }],
      certificates: [{ id: "c1", created_at: "2026-10-08T13:10:00Z", type: "comparecimento", payload: {} }],
      examRequests: [{ id: "e1", created_at: "2026-10-08T13:12:00Z", payload: {} }],
    },
    measurements: [
      { id: "m1", created_at: "2026-10-08T13:00:00Z", weight_grams: 12300, length_height_mm: 850, head_circumference_mm: null, systolic_bp: 90, diastolic_bp: 60 },
    ],
  } as unknown as ConsultRecords

  assert.equal(countConsultRecords(records), 4)
  assert.equal(
    formatConsultRecordsForAi(records),
    [
      "Documentos:",
      "• 10:05 Receita (Amoxicilina)",
      "• 10:10 Atestado de comparecimento",
      "• 10:12 Pedido de exame",
      "Medidas:",
      "• 10:00 12,3 kg · 85 cm (PA 90/60)",
    ].join("\n"),
  )
})

test("o dia da consulta é o da clínica, não o UTC", () => {
  assert.equal(clinicDay("2026-10-09T01:30:00Z"), "2026-10-08")
})

test("peso, altura e PC mais recentes vêm de medidas diferentes quando preciso", () => {
  const m = (weight_grams: number | null, length_height_mm: number | null, head_circumference_mm: number | null) =>
    ({ weight_grams, length_height_mm, head_circumference_mm }) as never
  assert.deepEqual(latestAnthropometry([m(10000, 800, 450), m(12345, null, null)]), {
    weight: "12,3",
    height: "80",
    head_circumference: "45",
  })
  assert.deepEqual(latestAnthropometry([]), { weight: null, height: null, head_circumference: null })
})

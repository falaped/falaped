import test from "node:test"
import assert from "node:assert/strict"

import { documentDetail, documentGroup, documentWhen } from "@/lib/document-list"

// 08/10/2026 (quinta) 15:00 em São Paulo.
const now = new Date("2026-10-08T18:00:00.000Z")

test("receita: primeiro remédio e quantos mais; sem remédio é o receituário em branco", () => {
  const payload = { medications: [{ name: "Amoxicilina 250 mg/5 mL" }, { name: "Dipirona" }] }
  assert.equal(documentDetail({ kind: "prescription", payload, certificateType: null }), "Amoxicilina 250 mg/5 mL e mais 1")
  assert.equal(documentDetail({ kind: "prescription", payload: {}, certificateType: null }), "Receituário em branco")
})

test("atestado, pedido de exame e encaminhamento", () => {
  assert.equal(
    documentDetail({ kind: "certificate", payload: { timeStart: "09:10", timeEnd: "09:32" }, certificateType: "comparecimento" }),
    "Comparecimento · 09:10 às 09:32",
  )
  assert.equal(documentDetail({ kind: "certificate", payload: { daysAway: 2 }, certificateType: "medico" }), "Afastamento · 2 dias")
  assert.equal(documentDetail({ kind: "exam-request", payload: { exams: ["Hemograma", "PCR"] }, certificateType: null }), "Hemograma e mais 1")
  assert.equal(
    documentDetail({ kind: "referral", payload: { specialty: "Otorrino", urgency: "prioritario" }, certificateType: null }),
    "Otorrino · Prioritário",
  )
})

test("grupos e datas no fuso da clínica", () => {
  // 01:30 UTC do dia 08 ainda é dia 07 em São Paulo.
  assert.equal(documentGroup("2026-10-08T01:30:00.000Z", now), "Esta semana")
  assert.equal(documentGroup("2026-10-08T12:05:00.000Z", now), "Hoje")
  assert.equal(documentWhen("2026-10-08T12:05:00.000Z", now), "09:05")
  assert.equal(documentWhen("2026-10-05T12:00:00.000Z", now), "Seg, 05/10")
  assert.equal(documentGroup("2026-09-29T12:00:00.000Z", now), "Antes")
  assert.equal(documentWhen("2026-09-29T12:00:00.000Z", now), "29/09")
  assert.equal(documentWhen("2025-09-29T12:00:00.000Z", now), "29/09/25")
})

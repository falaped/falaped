import test from "node:test"
import assert from "node:assert/strict"

import { formatScaleResultsSectionContent } from "@/modules/report-templates/format-scale-results-section"
import type { ScaleResult } from "@/modules/patient-scales/types"

function result(overrides: Partial<ScaleResult>): ScaleResult {
  return {
    id: "id",
    profile_id: "p",
    patient_id: "pt",
    case_id: "c",
    scale_key: "flacc",
    answers: {},
    score: 6,
    interpretation: "Dor moderada",
    applied_at: "2026-09-23T17:30:00Z",
    created_at: "2026-09-23T17:30:00Z",
    ...overrides,
  }
}

test("uma linha por escala, da mais antiga para a mais recente, no fuso da clínica", () => {
  const content = formatScaleResultsSectionContent([
    result({ applied_at: "2026-09-23T18:00:00Z", score: 2, interpretation: "Dor leve" }),
    result({}),
  ])
  const [first, second] = content.split("\n")
  // 17:30 UTC é 14:30 em São Paulo.
  assert.match(first, /: 6 — Dor moderada \(23\/09\/2026,? 14:30\)$/)
  assert.match(second, /: 2 — Dor leve \(23\/09\/2026,? 15:00\)$/)
})

test("escore nulo (PECARN) mostra só a conduta; chave desconhecida mostra a chave", () => {
  const content = formatScaleResultsSectionContent([
    result({ scale_key: "pecarn-2a-ou-mais", score: null, interpretation: "TC não recomendada" }),
    result({ scale_key: "escala-removida", applied_at: "2026-09-24T12:00:00Z" }),
  ])
  const [pecarn, unknown] = content.split("\n")
  assert.match(pecarn, /^PECARN .*: TC não recomendada \(/)
  assert.match(unknown, /^escala-removida: 6 — Dor moderada/)
})

test("sem escala, sem texto", () => {
  assert.equal(formatScaleResultsSectionContent([]), "")
})

import assert from "node:assert/strict"
import { test } from "node:test"

import { mergeExtractedBatches } from "./merge-extracted-batches"

test("renumera páginas por lote, funde cabeçalho e descarta item inválido", () => {
  const merged = mergeExtractedBatches(
    [
      {
        exam: { laboratory: "Lab A", collected_at: null, exam_types: ["Hemograma"] },
        items: [
          { name: "Hemoglobina", value: 11.2, unit: "g/dL", reference: "10,5 a 14,0", flag: "normal", page: 2 },
          { name: "", value: "x" },
        ],
      },
      {
        exam: { laboratory: null, collected_at: "10/09/2026", exam_types: ["Hemograma", "TSH"] },
        items: [{ name: "TSH", value: "6,1", unit: "µUI/mL", reference: "0,7 a 5,7", flag: "alto", page: 1 }],
      },
      "resposta quebrada",
    ],
    [0, 3, 4],
  )

  assert.deepEqual(merged.exam, {
    laboratory: "Lab A",
    collected_at: "10/09/2026",
    exam_types: ["Hemograma", "TSH"],
  })
  assert.equal(merged.items.length, 2)
  assert.equal(merged.items[0].value, "11.2")
  assert.equal(merged.items[0].page, 2)
  assert.equal(merged.items[1].page, 4)
  // "alto" não é flag válida → cai em unknown, mas a faixa é legível e 6,1 > 5,7.
  assert.equal(merged.items[1].flag, "high")
})

test("metades de página viram página do documento, repetidos somem e o laudo manda no status", () => {
  const merged = mergeExtractedBatches(
    [
      {
        items: [
          { name: "C3", value: "1,97", unit: "µmol/L", reference: "Menor que 7,09", flag: "normal", page: 1 },
          { name: "C3", value: "1,97", unit: "µmol/L", reference: "Menor que 7,09", flag: "normal", page: 1 },
          { name: "C4-OH", value: "0,16", unit: "µmol/L", reference: "Menor que 0.06", flag: "high", page: 3, lab_interpretation: "normal" },
        ],
      },
      { items: [{ name: "TSH", value: "9", unit: null, reference: "Menor que 8", flag: "normal", page: 2 }] },
    ],
    [0, 3],
    2,
  )
  assert.deepEqual(
    merged.items.map((i) => [i.name, i.page, i.flag]),
    [
      ["C3", 1, "normal"],
      ["C4-OH", 2, "normal"],
      ["TSH", 3, "high"],
    ],
  )
})

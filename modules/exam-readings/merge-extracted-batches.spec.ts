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
  assert.equal(merged.items[1].flag, "unknown")
})

import { test } from "node:test"
import assert from "node:assert/strict"

import { parseExamPanel, parsePrescriptionTemplate } from "@/modules/groq/lib/template-suggestion-parsers"

test("exames fora do catálogo são descartados e o nome vem do catálogo", () => {
  const raw = '```json\n{"suggestedName":"Anemia","exams":["hemograma completo","Exame inventado","Ferritina","Ferritina"]}\n```'
  assert.deepEqual(parseExamPanel(raw, "x", ["Hemograma completo", "Ferritina"]), {
    suggestedName: "Anemia",
    exams: ["Hemograma completo", "Ferritina"],
  })
})

test("resposta inválida vira painel vazio com o pedido como nome", () => {
  assert.deepEqual(parseExamPanel("não sei", "Anemia", ["Ferritina"]), { suggestedName: "Anemia", exams: [] })
})

test("medicamento sem como tomar é descartado", () => {
  const raw = '{"suggestedName":"Gripe","medications":[{"name":"Paracetamol 200 mg/mL, gotas","posology":"de 6/6 h se febre"},{"name":"Sem posologia"}],"orientations":"Hidratar."}'
  assert.deepEqual(parsePrescriptionTemplate(raw, "gripe"), {
    suggestedName: "Gripe",
    medications: [{ name: "Paracetamol 200 mg/mL, gotas", posology: "de 6/6 h se febre", duration: undefined }],
    orientations: "Hidratar.",
  })
})

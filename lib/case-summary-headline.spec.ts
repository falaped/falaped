import test from "node:test"
import assert from "node:assert/strict"

import { caseSummaryHeadline } from "@/lib/case-summary-headline"

test("motivo da consulta sai da 1ª linha do resumo", () => {
  assert.equal(caseSummaryHeadline("• Puericultura de 10 meses: peso 8,8 kg (P50).\n• Outra linha"), "Puericultura de 10 meses")
  assert.equal(caseSummaryHeadline("• Diarreia aguda há 2 dias, 6 evacuações/dia; febre 38,2 °C."), "Diarreia aguda há 2 dias")
  assert.equal(caseSummaryHeadline("\n• Otite média aguda à direita."), "Otite média aguda à direita")
  assert.equal(caseSummaryHeadline(null), null)
  assert.equal(caseSummaryHeadline("   "), null)
})

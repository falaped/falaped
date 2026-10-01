import { test } from "node:test"
import assert from "node:assert/strict"

import { recipientValues, renderTemplate } from "@/lib/message-template"

test("preenche variáveis e mantém chaves desconhecidas", () => {
  const values = recipientValues({ title: "Dra.", name: "Lorena Xavier", city: null, trialDaysLeft: 1 }, "Filipe")
  assert.equal(
    renderTemplate("Oi, {tratamento}! {nome} de {cidade}, faltam {dias_restantes}. {remetente} {outra}", values),
    "Oi, Dra. Lorena! Lorena de Minas, faltam 1 dia. Filipe {outra}",
  )
})

test("tratamento sem título é só o primeiro nome", () => {
  assert.equal(recipientValues({ title: null, name: "Paula Reis", city: "BH" }, "Filipe").tratamento, "Paula")
})

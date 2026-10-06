import { test } from "node:test"
import assert from "node:assert/strict"

import { momentsFor, recipientValues, renderTemplate } from "@/lib/message-template"

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

test("indicação cita quem indicou e só recebe modelos de indicação", () => {
  const values = recipientValues({ title: null, name: "Simone Caixeta", city: null, referredBy: "Dra. Gabriela Marinho" }, "Filipe")
  assert.equal(renderTemplate("por indicação da {indicado_por}", values), "por indicação da Dra. Gabriela Marinho")
  assert.deepEqual(momentsFor(true, values), ["indicacao"])
  const cold = recipientValues({ title: null, name: "Paula Reis", city: "BH" }, "Filipe")
  assert.ok(!momentsFor(true, cold).includes("indicacao"))
})

test("no WhatsApp os links do site levam utm_source=whatsapp; no e-mail não", () => {
  const values = recipientValues({ title: "Dra.", name: "Ana", city: null }, "Filipe")
  const text = "Conheça: {link}\nFerramentas: https://www.falaped.com.br/ferramentas.\nOutro: https://exemplo.com"
  assert.equal(
    renderTemplate(text, values, "whatsapp"),
    "Conheça: https://www.falaped.com.br?utm_source=whatsapp\nFerramentas: https://www.falaped.com.br/ferramentas?utm_source=whatsapp.\nOutro: https://exemplo.com",
  )
  assert.equal(renderTemplate("{link}", values, "email"), "https://www.falaped.com.br")
})

import assert from "node:assert/strict"
import { test } from "node:test"

import { buildProductionEmail } from "@/modules/books/emails/production-email"

test("e-mail de produção traz nome, criança e título; escapa HTML do cadastro", () => {
  const { subject, html, text } = buildProductionEmail({
    firstName: "Marina",
    childName: "Lara",
    title: "Lara vai ao pediatra",
  })
  assert.equal(subject, "O livro de Lara já está sendo produzido")
  assert.match(text, /Olá, Marina!/)
  assert.match(text, /“Lara vai ao pediatra” entrou em produção/)
  assert.match(text, /\(31\) 99781-5503/)
  assert.match(html, /Olá, Marina!/)

  const { html: escaped } = buildProductionEmail({
    firstName: '<script>alert("x")</script>',
    childName: "Lara",
    title: "Lara & o dia da vacina",
  })
  assert.ok(!escaped.includes("<script>"))
  assert.match(escaped, /&lt;script&gt;/)
  assert.match(escaped, /Lara &amp; o dia da vacina/)
})

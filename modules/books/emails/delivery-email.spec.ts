import assert from "node:assert/strict"
import { test } from "node:test"

import { bookPdfFilename, buildDeliveryEmail } from "@/modules/books/emails/delivery-email"

test("e-mail de entrega traz nome, criança e título; escapa HTML do cadastro", () => {
  const { subject, html, text } = buildDeliveryEmail({
    firstName: "Marina",
    childName: "Lara",
    title: "A Luz da Lara",
  })
  assert.equal(subject, "O livro de Lara ficou pronto")
  assert.match(text, /Olá, Marina!/)
  assert.match(text, /“A Luz da Lara” está pronto e vai anexado/)
  assert.match(text, /não expira/)
  assert.match(text, /\(31\) 99781-5503/)
  assert.match(html, /Olá, Marina!/)

  const { html: escaped } = buildDeliveryEmail({
    firstName: '<script>alert("x")</script>',
    childName: "Lara",
    title: "Lara & o dia da vacina",
  })
  assert.ok(!escaped.includes("<script>"))
  assert.match(escaped, /Lara &amp; o dia da vacina/)
})

test("nome do anexo vira slug sem acento nem espaço", () => {
  assert.equal(bookPdfFilename("Samuel"), "livro-samuel.pdf")
  assert.equal(bookPdfFilename("João Pedro"), "livro-joao-pedro.pdf")
  assert.equal(bookPdfFilename("Ana-Clara"), "livro-ana-clara.pdf")
  assert.equal(bookPdfFilename("🙂"), "livro-falaped.pdf")
})

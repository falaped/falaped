import assert from "node:assert/strict"
import { test } from "node:test"

import { buildBrandEmail } from "./brand-email"

test("parágrafos, destaque, P.S. e assinatura", () => {
  const { html, text } = buildBrandEmail({
    senderName: "Filipe",
    body: "Olá, Dra. Paula,\n\nTexto <com> tag.\n\n• 15 dias grátis.\n• R$ 49,99 por mês.\n\nVeja https://falaped.com.br e https://www.falaped.com.br/ferramentas\n\nP.S.: Responda \"não\".",
  })
  assert.match(text, /^Olá, Dra\. Paula,/)
  assert.match(text, /Um abraço,\nFilipe\nCEO · Falaped\n\nP\.S\./)
  assert.ok(html.includes("Texto &lt;com&gt; tag."))
  assert.ok(html.includes("<li") && html.includes("15 dias grátis."))
  assert.ok(html.includes('href="https://falaped.com.br?utm_source=email'))
  assert.ok(html.includes('href="https://www.falaped.com.br/ferramentas?utm_source=email'))
  assert.ok(html.indexOf("CEO · Falaped") < html.indexOf("P.S."))
})
